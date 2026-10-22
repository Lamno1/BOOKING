import java.nio.file.*;
import java.sql.*;
// SQLite creates a consistent standalone snapshot, including committed WAL data.
class BackupBookingLedger {
 public static void main(String[] args)throws Exception {
  Path source=Path.of(args[0]).toRealPath(),destination=Path.of(args[1]).toAbsolutePath().normalize();
  if(!Files.isRegularFile(source)||Files.exists(destination))throw new IllegalArgumentException("Source must exist and destination must be new.");
  Files.createDirectories(destination.getParent());
  try(var db=DriverManager.getConnection("jdbc:sqlite:"+source);var query=db.createStatement()){
   query.execute("VACUUM INTO '"+destination.toString().replace("'","''")+"'");
  }
  System.out.println("Consistent backup: "+destination);
 }
}
