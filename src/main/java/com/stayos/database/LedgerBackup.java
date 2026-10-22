package com.stayos.database;

import java.io.IOException;
import java.nio.file.*;
import java.sql.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

/** Consistent SQLite snapshots (committed WAL included) with bounded retention. Never writes to the live ledger. */
public final class LedgerBackup {
  public static final String PREFIX="stayos-auto-";
  private static final DateTimeFormatter STAMP=DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss").withZone(ZoneOffset.UTC);
  private LedgerBackup(){}

  public static Path backup(Path database,Path folder,int keep,Instant now) throws SQLException, IOException {
    if(keep<1)throw new IllegalArgumentException("keep must be at least 1");
    Files.createDirectories(folder);
    Path target=folder.resolve(PREFIX+STAMP.format(now)+".sqlite").toAbsolutePath().normalize();
    if(Files.exists(target))return target;
    try(var db=DriverManager.getConnection("jdbc:sqlite:"+database.toAbsolutePath());var s=db.createStatement()){
      s.execute("PRAGMA busy_timeout=5000");
      s.execute("VACUUM INTO '"+target.toString().replace("'","''")+"'");
    }
    prune(folder,keep);
    return target;
  }

  /** Deletes only this job's own snapshots, oldest first; manual backups in the folder are left alone. */
  static void prune(Path folder,int keep) throws IOException {
    List<Path> snapshots=new ArrayList<>();
    try(var files=Files.list(folder)){files.filter(p->{String n=p.getFileName().toString();return n.startsWith(PREFIX)&&n.endsWith(".sqlite");}).forEach(snapshots::add);}
    snapshots.sort(Comparator.comparing(p->p.getFileName().toString()));
    for(int i=0;i<snapshots.size()-keep;i++)Files.deleteIfExists(snapshots.get(i));
  }
}
