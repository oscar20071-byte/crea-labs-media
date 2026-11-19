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
export async function onRequest(context){
  const {request,env}=context,url=new URL(request.url);
  if(!url.pathname.startsWith("/api/")) return new Response("Not found",{status:404});
  const path=url.pathname.slice(5);
  try{
    const auth=await authRoutes(request,env,path); if(auth) return auth;
    const videos=await videoRoutes(request,env,path); if(videos) return videos;
    const channels=await channelRoutes(request,env,path); if(channels) return channels;
    return fail("Ruta no encontrada.",404);
  }catch(error){
    console.error("API error",error);
    return fail("Error interno. Revisa que las vinculaciones D1 y R2 estén configuradas.",500);
  }
}
