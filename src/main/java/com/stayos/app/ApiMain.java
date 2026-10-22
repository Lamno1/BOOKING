package com.stayos.app;

import com.stayos.auth.*;
import com.stayos.booking.BookingService;
import com.stayos.database.LedgerBackup;
import com.stayos.http.ServerConfig;
import java.nio.file.*;
import java.time.Instant;
import java.util.concurrent.*;

/** Runs the web API without opening a JavaFX window. */
public final class ApiMain {
  public static void main(String[] args) throws Exception {
    // A client that opens a connection and trickles bytes is cut off instead of holding a thread forever.
    System.setProperty("sun.net.httpserver.maxReqTime","30");
    System.setProperty("sun.net.httpserver.maxRspTime","60");
    System.setProperty("jdk.httpserver.maxConnections","2000");
    var config=ServerConfig.fromEnvironment(System.getenv());
    Path file=Path.of(System.getenv().getOrDefault("STAYOS_DATABASE","data/stayos-web.sqlite")).toAbsolutePath();
    Files.createDirectories(file.getParent());
    var auth=new AuthService("jdbc:sqlite:"+file);
    var weak=auth.adminsWithDefaultPassword();
    if(!weak.isEmpty()){
      // A demo password is printed in old docs and history; serving the public with it would hand out the staff console.
      if(config.isPublic()){System.err.println("Refusing to start in public mode: an admin account still uses a demo default password. Change it in Tài khoản (12+ characters) first.");System.exit(2);}
      System.err.println("WARNING: an admin account still uses a demo default password. Change it before exposing this server.");
    }
    var bookings=new BookingService("jdbc:sqlite:"+file);
    int port=Integer.parseInt(System.getenv().getOrDefault("STAYOS_PORT","8080"));
    if(port<1024||port>65535)throw new IllegalArgumentException("STAYOS_PORT must be between 1024 and 65535.");
    var server=new AuthServer(auth,bookings,port,config);
    var backups=scheduleBackups(file);
    var housekeeping=Executors.newSingleThreadScheduledExecutor(task->{var thread=new Thread(task,"stayos-sessions");thread.setDaemon(true);return thread;});
    housekeeping.scheduleAtFixedRate(()->{try{auth.purgeExpiredSessions();}catch(RuntimeException e){System.err.println("Session purge failed: "+e.getMessage());}},1,1,TimeUnit.HOURS);
    Runtime.getRuntime().addShutdownHook(new Thread(()->{if(backups!=null)backups.shutdownNow();server.stop();try{bookings.close();auth.close();}catch(Exception ignored){}}));
    server.start();
    System.out.println("STAYOS API ready at http://"+config.bind()+":"+port+(config.webRoot()!=null?" (serving "+config.webRoot()+")":""));
    new CountDownLatch(1).await();
  }

  /** Snapshot at start and every 24 h unless STAYOS_BACKUP=off. A failed snapshot is logged and retried next cycle. */
  private static ScheduledExecutorService scheduleBackups(Path database){
    if("off".equalsIgnoreCase(System.getenv("STAYOS_BACKUP")))return null;
    Path folder=Path.of(System.getenv().getOrDefault("STAYOS_BACKUP_DIR",database.getParent().resolve("backups").resolve("auto").toString()));
    int keep=Integer.parseInt(System.getenv().getOrDefault("STAYOS_BACKUP_KEEP","14"));
    var executor=Executors.newSingleThreadScheduledExecutor(task->{var thread=new Thread(task,"stayos-backup");thread.setDaemon(true);return thread;});
    executor.scheduleAtFixedRate(()->{
      try{System.out.println("STAYOS backup: "+LedgerBackup.backup(database,folder,keep,Instant.now()));}
      catch(Exception e){System.err.println("STAYOS backup failed: "+e.getMessage());}
    },0,24,TimeUnit.HOURS);
    return executor;
  }
}
