package com.stayos.http;

import com.sun.net.httpserver.*;
import java.io.IOException;
import java.nio.file.*;
import java.util.Map;

/** Serves the built frontend read-only, never outside its root, with browser security headers. */
public final class StaticSite implements HttpHandler {
  private static final Map<String,String> TYPES=Map.ofEntries(
    Map.entry("html","text/html; charset=utf-8"),Map.entry("js","text/javascript; charset=utf-8"),Map.entry("css","text/css; charset=utf-8"),
    Map.entry("json","application/json; charset=utf-8"),Map.entry("svg","image/svg+xml"),Map.entry("png","image/png"),Map.entry("jpg","image/jpeg"),
    Map.entry("jpeg","image/jpeg"),Map.entry("webp","image/webp"),Map.entry("avif","image/avif"),Map.entry("ico","image/x-icon"),Map.entry("mp4","video/mp4"),
    Map.entry("webm","video/webm"),Map.entry("woff2","font/woff2"),Map.entry("txt","text/plain; charset=utf-8"),Map.entry("glb","model/gltf-binary"));
  // Same-origin API, no inline script, no framing. 'unsafe-inline' styles: React style={} attributes.
  static final String CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; "
    +"font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
  private final Path root;
  public StaticSite(Path root){this.root=root.toAbsolutePath().normalize();}

  @Override public void handle(HttpExchange x)throws IOException{
    try(x){
      String method=x.getRequestMethod();
      SecurityHeaders.apply(x.getResponseHeaders());
      if(!method.equals("GET")&&!method.equals("HEAD")){x.getResponseHeaders().set("Allow","GET, HEAD");x.sendResponseHeaders(405,-1);return;}
      Path file=resolve(x.getRequestURI().getPath());
      if(file==null){x.sendResponseHeaders(404,-1);return;}
      String name=file.getFileName().toString(),ext=name.contains(".")?name.substring(name.lastIndexOf('.')+1).toLowerCase():"";
      var h=x.getResponseHeaders();
      h.set("Content-Type",TYPES.getOrDefault(ext,"application/octet-stream"));
      // Vite fingerprints everything under assets/, so those can be cached for a year; pages always revalidate.
      h.set("Cache-Control",x.getRequestURI().getPath().startsWith("/assets/")?"public, max-age=31536000, immutable":"no-cache");
      if(ext.equals("html"))h.set("Content-Security-Policy",CSP);
      long size=Files.size(file);
      if(method.equals("HEAD")){h.set("Content-Length",Long.toString(size));x.sendResponseHeaders(200,-1);return;}
      x.sendResponseHeaders(200,size);
      try(var out=x.getResponseBody()){Files.copy(file,out);}
    }
  }

  /** Request path to a file under the root, or null. "/" and unknown extension-less paths fall back to index.html. */
  Path resolve(String path){
    if(path==null||path.contains("\0")||path.contains("\\"))return null;
    String clean=path.equals("/")?"index.html":path.substring(1);
    Path file=root.resolve(clean).normalize();
    if(!file.startsWith(root))return null;
    try{if(Files.isRegularFile(file)&&!Files.isHidden(file)&&file.toRealPath().startsWith(root.toRealPath()))return file;}catch(IOException e){return null;}
    return clean.contains(".")?null:root.resolve("index.html");
  }
}
