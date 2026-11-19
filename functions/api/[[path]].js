const SESSION_COOKIE = "__Host-cl_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const MAX_VIDEO_BYTES = 90 * 1024 * 1024;
const CATEGORIES = ["Música","Gaming","Deportes","Tecnología","Educación","Entretenimiento","Otros"];

function json(data, status=200, headers={}) {
  return new Response(JSON.stringify(data), {status, headers: {"content-type":"application/json; charset=utf-8","cache-control":"no-store",...headers}});
}
function fail(message,status=400){ return json({error:message},status); }
function cookie(request,name){
  const raw=request.headers.get("Cookie")||"";
  const item=raw.split(";").map(x=>x.trim()).find(x=>x.startsWith(name+"="));
  return item ? decodeURIComponent(item.slice(name.length+1)) : "";
}
function bytesToHex(bytes){ return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,"0")).join(""); }
function hexToBytes(hex){ return new Uint8Array((hex.match(/.{1,2}/g)||[]).map(x=>parseInt(x,16))); }
async function digest(value){ return bytesToHex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value))); }
async function passwordHash(password,salt){
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt:hexToBytes(salt),iterations:100000,hash:"SHA-256"},key,256);
  return bytesToHex(bits);
}
async function currentUser(request,env){
  const token=cookie(request,SESSION_COOKIE);
  if(!token) return null;
  const tokenHash=await digest(token);
  const row=await env.DB.prepare("SELECT users.id, users.email, users.display_name FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>?").bind(tokenHash,Date.now()).first();
  return row||null;
}
function sessionCookie(token){ return SESSION_COOKIE+"="+encodeURIComponent(token)+"; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age="+SESSION_SECONDS; }
function clearCookie(){ return SESSION_COOKIE+"=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"; }
function safeUser(user){ return {id:user.id,email:user.email,displayName:user.display_name}; }
async function requireUser(request,env){ return currentUser(request,env); }
async function authRoutes(request,env,path){
  if(path==="auth/me" && request.method==="GET"){
    const user=await currentUser(request,env); return json({user:user?safeUser(user):null});
  }
  if(path==="auth/register" && request.method==="POST"){
    const body=await request.json().catch(()=>null);
    if(!body) return fail("Solicitud no válida.");
    const email=String(body.email||"").trim().toLowerCase();
    const password=String(body.password||"");
    const displayName=String(body.displayName||"").trim().slice(0,40);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Escribe un correo válido.");
    if(password.length<10 || password.length>128) return fail("La contraseña debe tener entre 10 y 128 caracteres.");
    if(displayName.length<2) return fail("El nombre debe tener al menos 2 caracteres.");
    const exists=await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first();
    if(exists) return fail("Ese correo ya tiene una cuenta.",409);
    const id=crypto.randomUUID(),salt=bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
    const hash=await passwordHash(password,salt);
    await env.DB.prepare("INSERT INTO users (id,email,password_salt,password_hash,display_name,created_at) VALUES (?,?,?,?,?,?)").bind(id,email,salt,hash,displayName,Date.now()).run();
    await env.DB.prepare("INSERT INTO channels (id,owner_id,name,description,created_at) VALUES (?,?,?,?,?)").bind(id,id,displayName,"Canal de "+displayName,Date.now()).run();
    const token=bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
    await env.DB.prepare("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)").bind(await digest(token),id,Date.now()+SESSION_SECONDS*1000).run();
    return json({user:{id,email,displayName}},201,{"set-cookie":sessionCookie(token)});
  }
  if(path==="auth/login" && request.method==="POST"){
    const body=await request.json().catch(()=>null);
    const email=String(body?.email||"").trim().toLowerCase(),password=String(body?.password||"");
    const user=await env.DB.prepare("SELECT * FROM users WHERE email=?").bind(email).first();
    if(!user || await passwordHash(password,user.password_salt)!==user.password_hash) return fail("Correo o contraseña incorrectos.",401);
    const token=bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
    await env.DB.prepare("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)").bind(await digest(token),user.id,Date.now()+SESSION_SECONDS*1000).run();
    return json({user:safeUser(user)},200,{"set-cookie":sessionCookie(token)});
  }
  if(path==="auth/logout" && request.method==="POST"){
    const token=cookie(request,SESSION_COOKIE);
    if(token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await digest(token)).run();
    return json({ok:true},{headers:{"set-cookie":clearCookie()}});
  }
  return null;
}
async function videoRoutes(request,env,path){
  if(path==="studio/videos" && request.method==="GET"){
    const user=await requireUser(request,env); if(!user) return fail("Inicia sesión para abrir Studio.",401);
    const rows=await env.DB.prepare("SELECT v.id,v.title,v.description,v.category,v.size,v.created_at,(SELECT COUNT(*) FROM likes l WHERE l.video_id=v.id) AS likes,(SELECT COUNT(*) FROM comments c WHERE c.video_id=v.id) AS comments FROM videos v WHERE v.owner_id=? ORDER BY v.created_at DESC LIMIT 200").bind(user.id).all();
    return json({videos:rows.results||[]});
  }
  if(path==="videos" && request.method==="GET"){
    const rows=await env.DB.prepare("SELECT v.id,v.title,v.description,v.category,v.size,v.created_at,u.display_name AS creator,c.name AS channel_name,(SELECT COUNT(*) FROM likes l WHERE l.video_id=v.id) AS likes,(SELECT COUNT(*) FROM comments cm WHERE cm.video_id=v.id) AS comments FROM videos v JOIN users u ON u.id=v.owner_id LEFT JOIN channels c ON c.id=v.channel_id WHERE v.status='published' ORDER BY v.created_at DESC LIMIT 100").all();
    return json({videos:(rows.results||[]).map(v=>({...v,streamUrl:"/api/stream/"+v.id}))});
  }
  if(path==="videos" && request.method==="POST"){
    const user=await requireUser(request,env); if(!user) return fail("Inicia sesión para publicar vídeos.",401);
    const form=await request.formData().catch(()=>null); if(!form) return fail("Formulario de subida no válido.");
    const file=form.get("video"),title=String(form.get("title")||"").trim(),description=String(form.get("description")||"").trim(),category=String(form.get("category")||"Otros");
    if(!file || typeof file.stream!=="function") return fail("Selecciona un archivo de vídeo.");
    if(!file.type.startsWith("video/")) return fail("El archivo debe ser un vídeo.");
    if(file.size<1 || file.size>MAX_VIDEO_BYTES) return fail("El vídeo debe pesar menos de 90 MB.");
    if(title.length<3 || title.length>100) return fail("El título debe tener entre 3 y 100 caracteres.");
    if(description.length>1000) return fail("La descripción no puede superar 1000 caracteres.");
    if(!CATEGORIES.includes(category)) return fail("Categoría no válida.");
    const id=crypto.randomUUID(),key="videos/"+id;
    await env.VIDEOS.put(key,file.stream(),{httpMetadata:{contentType:file.type,cacheControl:"public, max-age=3600"},customMetadata:{ownerId:user.id,videoId:id}});
    try{
      await env.DB.prepare("INSERT INTO videos (id,owner_id,channel_id,title,description,category,object_key,mime_type,size,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,'published',?)").bind(id,user.id,user.id,title,description,category,key,file.type,file.size,Date.now()).run();
    }catch(err){ await env.VIDEOS.delete(key); throw err; }
    return json({ok:true,video:{id,title,description,category,streamUrl:"/api/stream/"+id}},{status:201});
  }
  if(path.startsWith("stream/") && request.method==="GET"){
    const id=path.slice(7);
    const video=await env.DB.prepare("SELECT object_key,mime_type,size FROM videos WHERE id=? AND status='published'").bind(id).first();
    if(!video) return fail("Vídeo não encontrado.",404);
    const range=request.headers.get("Range");
    let object,headers={"content-type":video.mime_type||"video/mp4","accept-ranges":"bytes","cache-control":"public, max-age=3600"};
    if(range){
      const match=/bytes=(\d*)-(\d*)/.exec(range);
      if(!match) return new Response(null,{status:416});
      let start=match[1]?Number(match[1]):0,end=match[2]?Number(match[2]):video.size-1;
      if(!match[1] && match[2]){const suffix=Number(match[2]);start=Math.max(0,video.size-suffix);end=video.size-1;}
      if(start>=video.size || end<start) return new Response(null,{status:416,headers:{"content-range":"bytes */"+video.size}});
      end=Math.min(end,video.size-1);
      object=await env.VIDEOS.get(video.object_key,{range:{offset:start,length:end-start+1}});
      headers["content-range"]="bytes "+start+"-"+end+"/"+video.size;
      headers["content-length"]=String(end-start+1);
      return new Response(object?.body,{status:206,headers});
    }
    object=await env.VIDEOS.get(video.object_key);
    if(!object) return fail("Archivo no encontrado.",404);
    headers["content-length"]=String(video.size);
    return new Response(object.body,{headers});
  }
  const manageMatch=/^videos\/([^/]+)$/.exec(path);
  if(manageMatch && (request.method==="PATCH" || request.method==="DELETE")){
    const user=await requireUser(request,env); if(!user) return fail("Inicia sesión para gestionar vídeos.",401);
    const video=await env.DB.prepare("SELECT id,object_key FROM videos WHERE id=? AND owner_id=?").bind(manageMatch[1],user.id).first();
    if(!video) return fail("Vídeo no encontrado o no tienes permiso.",404);
    if(request.method==="DELETE"){
      await env.DB.prepare("DELETE FROM videos WHERE id=? AND owner_id=?").bind(video.id,user.id).run();
      await env.VIDEOS.delete(video.object_key);
      return json({ok:true});
    }
    const body=await request.json().catch(()=>null); if(!body) return fail("Datos no válidos.");
    const title=String(body.title||"").trim(),description=String(body.description||"").trim(),category=String(body.category||"Otros");
    if(title.length<3||title.length>100) return fail("El título debe tener entre 3 y 100 caracteres.");
    if(description.length>1000) return fail("La descripción no puede superar 1000 caracteres.");
    if(!CATEGORIES.includes(category)) return fail("Categoría no válida.");
    await env.DB.prepare("UPDATE videos SET title=?,description=?,category=? WHERE id=? AND owner_id=?").bind(title,description,category,video.id,user.id).run();
    return json({ok:true});
  }
  const likeMatch=/^videos\/([^/]+)\/like$/.exec(path);
  if(likeMatch && request.method==="POST"){
    const user=await requireUser(request,env); if(!user) return fail("Inicia sesión para dar like.",401);
    const videoId=likeMatch[1],exists=await env.DB.prepare("SELECT 1 FROM likes WHERE user_id=? AND video_id=?").bind(user.id,videoId).first();
    if(exists) await env.DB.prepare("DELETE FROM likes WHERE user_id=? AND video_id=?").bind(user.id,videoId).run();
    else await env.DB.prepare("INSERT INTO likes (user_id,video_id,created_at) VALUES (?,?,?)").bind(user.id,videoId,Date.now()).run();
    const count=await env.DB.prepare("SELECT COUNT(*) AS total FROM likes WHERE video_id=?").bind(videoId).first();
    return json({liked:!exists,count:count.total});
  }
  const commentsMatch=/^videos\/([^/]+)\/comments$/.exec(path);
  if(commentsMatch && request.method==="GET"){
    const rows=await env.DB.prepare("SELECT c.id,c.body,c.created_at,u.display_name AS author FROM comments c JOIN users u ON u.id=c.user_id WHERE c.video_id=? ORDER BY c.created_at DESC LIMIT 100").bind(commentsMatch[1]).all();
    return json({comments:rows.results||[]});
  }
  if(commentsMatch && request.method==="POST"){
    const user=await requireUser(request,env); if(!user) return fail("Inicia sesión para comentar.",401);
    const body=await request.json().catch(()=>null),comment=String(body?.body||"").trim();
    if(comment.length<1 || comment.length>500) return fail("El comentario debe tener entre 1 y 500 caracteres.");
    const id=crypto.randomUUID();
    await env.DB.prepare("INSERT INTO comments (id,video_id,user_id,body,created_at) VALUES (?,?,?,?,?)").bind(id,commentsMatch[1],user.id,comment,Date.now()).run();
    return json({ok:true},{status:201});
  }
  return null;
}
async function channelRoutes(request,env,path){
  if(path==="channels" && request.method==="GET"){
    const rows=await env.DB.prepare("SELECT c.id,c.name,c.description,u.display_name AS owner,(SELECT COUNT(*) FROM videos v WHERE v.channel_id=c.id AND v.status='published') AS videos FROM channels c JOIN users u ON u.id=c.owner_id ORDER BY c.created_at DESC LIMIT 100").all();
    return json({channels:rows.results||[]});
  }
  return null;
}

async function communityRoutes(request,env,path){
  const user=await currentUser(request,env);
  if(path.startsWith("community/") && !user) return fail("Inicia sesión para usar las comunidades.",401);
  if(path==="community/servers" && request.method==="GET"){
    let rows=await env.DB.prepare("SELECT g.id,g.name,g.owner_id,m.role FROM guild_members m JOIN guilds g ON g.id=m.guild_id WHERE m.user_id=? ORDER BY g.created_at").bind(user.id).all();
    if(!rows.results?.length){
      const id=crypto.randomUUID(),channelId=crypto.randomUUID(),now=Date.now();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO guilds (id,name,owner_id,created_at) VALUES (?,?,?,?)").bind(id,"Mi comunidad",user.id,now),
        env.DB.prepare("INSERT INTO guild_members (guild_id,user_id,role,joined_at) VALUES (?,?,?,?)").bind(id,user.id,"owner",now),
        env.DB.prepare("INSERT INTO chat_channels (id,guild_id,name,channel_type,position,created_at) VALUES (?,?,?,?,?,?)").bind(channelId,id,"general","text",0,now)
      ]);
      rows=await env.DB.prepare("SELECT g.id,g.name,g.owner_id,m.role FROM guild_members m JOIN guilds g ON g.id=m.guild_id WHERE m.user_id=? ORDER BY g.created_at").bind(user.id).all();
    }
    return json({servers:rows.results||[]});
  }
  if(path==="community/servers" && request.method==="POST"){
    const body=await request.json().catch(()=>null),name=String(body?.name||"").trim();
    if(name.length<2||name.length>60) return fail("El nombre debe tener entre 2 y 60 caracteres.");
    const id=crypto.randomUUID(),channelId=crypto.randomUUID(),now=Date.now();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO guilds (id,name,owner_id,created_at) VALUES (?,?,?,?)").bind(id,name,user.id,now),
      env.DB.prepare("INSERT INTO guild_members (guild_id,user_id,role,joined_at) VALUES (?,?,?,?)").bind(id,user.id,"owner",now),
      env.DB.prepare("INSERT INTO chat_channels (id,guild_id,name,channel_type,position,created_at) VALUES (?,?,?,?,?,?)").bind(channelId,id,"general","text",0,now)
    ]);
    return json({server:{id,name,role:"owner"},channel:{id:channelId,name:"general"}},201);
  }
  const serverMatch=/^community\/servers\/([^/]+)\/channels$/.exec(path);
  if(serverMatch && request.method==="GET"){
    const member=await env.DB.prepare("SELECT role FROM guild_members WHERE guild_id=? AND user_id=?").bind(serverMatch[1],user.id).first();
    if(!member) return fail("No tienes acceso a este servidor.",403);
    const rows=await env.DB.prepare("SELECT id,name,channel_type,position FROM chat_channels WHERE guild_id=? ORDER BY position,created_at").bind(serverMatch[1]).all();
    return json({channels:rows.results||[],role:member.role});
  }
  if(serverMatch && request.method==="POST"){
    const member=await env.DB.prepare("SELECT role FROM guild_members WHERE guild_id=? AND user_id=?").bind(serverMatch[1],user.id).first();
    if(!member || !["owner","admin"].includes(member.role)) return fail("Solo el propietario o un administrador puede crear canales.",403);
    const body=await request.json().catch(()=>null),name=String(body?.name||"").trim().toLowerCase().replace(/[^a-z0-9áéíóúñ_-]/gi,"-").slice(0,40);
    if(name.length<2) return fail("El nombre del canal debe tener al menos 2 caracteres.");
    const id=crypto.randomUUID(),now=Date.now();
    await env.DB.prepare("INSERT INTO chat_channels (id,guild_id,name,channel_type,position,created_at) VALUES (?,?,?,?,?,?)").bind(id,serverMatch[1],name,"text",Date.now(),now).run();
    return json({channel:{id,name,channel_type:"text"}},201);
  }
  const messagesMatch=/^community\/channels\/([^/]+)\/messages$/.exec(path);
  if(messagesMatch && request.method==="GET"){
    const channel=await env.DB.prepare("SELECT c.id,c.guild_id FROM chat_channels c JOIN guild_members m ON m.guild_id=c.guild_id WHERE c.id=? AND m.user_id=?").bind(messagesMatch[1],user.id).first();
    if(!channel) return fail("Canal no encontrado o sin acceso.",404);
    const after=Number(new URL(request.url).searchParams.get("after")||0);
    const rows=await env.DB.prepare("SELECT msg.id,msg.body,msg.created_at,u.id AS user_id,u.display_name AS author FROM messages msg JOIN users u ON u.id=msg.user_id WHERE msg.channel_id=? AND msg.created_at>? ORDER BY msg.created_at DESC LIMIT 100").bind(channel.id,after).all();
    return json({messages:(rows.results||[]).reverse()});
  }
  if(messagesMatch && request.method==="POST"){
    const channel=await env.DB.prepare("SELECT c.id FROM chat_channels c JOIN guild_members m ON m.guild_id=c.guild_id WHERE c.id=? AND m.user_id=?").bind(messagesMatch[1],user.id).first();
    if(!channel) return fail("Canal no encontrado o sin acceso.",404);
    const body=await request.json().catch(()=>null),message=String(body?.body||"").trim();
    if(!message||message.length>2000) return fail("El mensaje debe tener entre 1 y 2000 caracteres.");
    const id=crypto.randomUUID(),now=Date.now();
    await env.DB.prepare("INSERT INTO messages (id,channel_id,user_id,body,created_at) VALUES (?,?,?,?,?)").bind(id,channel.id,user.id,message,now).run();
    return json({message:{id,body:message,created_at:now,user_id:user.id,author:user.display_name}},201);
  }
  return null;
}

export async function onRequest(context){
  const {request,env}=context,url=new URL(request.url);
  if(!url.pathname.startsWith("/api/")) return new Response("Not found",{status:404});
  const path=url.pathname.slice(5);
  try{
    const auth=await authRoutes(request,env,path); if(auth) return auth;
    const videos=await videoRoutes(request,env,path); if(videos) return videos;
    const channels=await channelRoutes(request,env,path); if(channels) return channels;
    const community=await communityRoutes(request,env,path); if(community) return community;
    return fail("Ruta no encontrada.",404);
  }catch(error){
    console.error("API error",error);
    return fail("Error interno. Comprueba la configuración de la base de datos D1.",500);
  }
}
