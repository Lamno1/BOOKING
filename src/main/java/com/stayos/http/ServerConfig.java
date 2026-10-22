package com.stayos.http;

import java.nio.file.*;
import java.util.*;

/**
 * Everything that differs between a developer laptop and a public deployment, read once from the environment.
 *
 * STAYOS_BIND            address to listen on (default 127.0.0.1; put a TLS reverse proxy in front for public traffic)
 * STAYOS_ALLOWED_ORIGINS extra browser origins allowed to call the API, comma separated (e.g. https://stayos.vn)
 * STAYOS_SECURE_COOKIE   true when the site is served over HTTPS, so the session cookie is never sent in clear text
 * STAYOS_TRUST_PROXY     true only behind your own reverse proxy: the client IP is then read from X-Forwarded-For
 * STAYOS_WEB_ROOT        built frontend (vite build output) to serve on the same origin as the API
 * STAYOS_RATE_LIMIT      API calls per client IP per minute (default 1200; mobile carriers put many guests behind one IP)
 */
public record ServerConfig(String bind,Set<String> origins,boolean secureCookie,boolean trustProxy,Path webRoot,int requestsPerMinute){
  static final int DEFAULT_RATE=1200;
  static final Set<String> DEV_ORIGINS=Set.of("http://127.0.0.1:5174","http://localhost:5174","http://127.0.0.1:5173","http://localhost:5173","http://127.0.0.1:5184","http://localhost:5184");

  /** Local development defaults: loopback only, the Vite dev origins, no static site. */
  public static ServerConfig local(){return new ServerConfig("127.0.0.1",DEV_ORIGINS,false,false,null,DEFAULT_RATE);}
  /** Reachable by people outside this machine: a non-loopback address, or running behind an HTTPS proxy. */
  public boolean isPublic(){return !(bind.equals("127.0.0.1")||bind.equals("localhost")||bind.equals("::1"))||secureCookie||trustProxy;}
  public ServerConfig withRate(int perMinute){return new ServerConfig(bind,origins,secureCookie,trustProxy,webRoot,perMinute);}

  public static ServerConfig fromEnvironment(Map<String,String> env){
    var origins=new LinkedHashSet<>(DEV_ORIGINS);
    for(String origin:env.getOrDefault("STAYOS_ALLOWED_ORIGINS","").split(",")){
      String o=origin.trim();if(o.isEmpty())continue;
      if(!o.matches("https?://[A-Za-z0-9.-]+(:\\d{1,5})?"))throw new IllegalArgumentException("STAYOS_ALLOWED_ORIGINS: invalid origin "+o);
      origins.add(o);
    }
    Path root=null;String configured=env.get("STAYOS_WEB_ROOT");
    if(configured!=null&&!configured.isBlank()){root=Path.of(configured).toAbsolutePath().normalize();if(!Files.isRegularFile(root.resolve("index.html")))throw new IllegalArgumentException("STAYOS_WEB_ROOT has no index.html: "+root);}
    return new ServerConfig(env.getOrDefault("STAYOS_BIND","127.0.0.1"),Set.copyOf(origins),
      Boolean.parseBoolean(env.get("STAYOS_SECURE_COOKIE")),Boolean.parseBoolean(env.get("STAYOS_TRUST_PROXY")),root,
      Integer.parseInt(env.getOrDefault("STAYOS_RATE_LIMIT",Integer.toString(DEFAULT_RATE))));
  }
}
