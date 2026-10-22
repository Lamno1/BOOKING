package com.stayos;

import com.stayos.database.LedgerBackup;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.*;
import java.sql.*;
import java.time.Instant;
import static org.junit.jupiter.api.Assertions.*;

class LedgerBackupTest {
  @TempDir Path temp;
  @Test void snapshotIncludesCommittedWalAndKeepsOnlyRecentAutomaticCopies()throws Exception{
    Path db=temp.resolve("live.sqlite"),folder=temp.resolve("backups");
    try(var live=DriverManager.getConnection("jdbc:sqlite:"+db);var s=live.createStatement()){
      s.execute("PRAGMA journal_mode=WAL");s.execute("CREATE TABLE stay_bookings(id TEXT)");s.execute("INSERT INTO stay_bookings VALUES('ST-1')");
      Files.createDirectories(folder);Files.writeString(folder.resolve("manual-before-change.sqlite"),"manual");
      Instant start=Instant.parse("2026-10-21T00:00:00Z");Path first=null;
      for(int day=0;day<4;day++){var copy=LedgerBackup.backup(db,folder,2,start.plusSeconds(day*86400L));if(first==null)first=copy;}
      assertFalse(Files.exists(first));assertTrue(Files.exists(folder.resolve("manual-before-change.sqlite")));
      try(var files=Files.list(folder)){assertEquals(2,files.filter(p->p.getFileName().toString().startsWith(LedgerBackup.PREFIX)).count());}
      var latest=LedgerBackup.backup(db,folder,2,start.plusSeconds(3*86400L));
      try(var copy=DriverManager.getConnection("jdbc:sqlite:"+latest);var q=copy.createStatement();var r=q.executeQuery("SELECT id FROM stay_bookings")){assertTrue(r.next());assertEquals("ST-1",r.getString(1));}
    }
    assertThrows(IllegalArgumentException.class,()->LedgerBackup.backup(db,folder,0,Instant.now()));
  }
}
