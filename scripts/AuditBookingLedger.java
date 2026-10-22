import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.*;
import java.util.HexFormat;
// Read-only aggregate fingerprints. Never prints customer data or mutates the database.
class AuditBookingLedger {
  public static void main(String[] args)throws Exception {
    try(var db=DriverManager.getConnection("jdbc:sqlite:file:"+args[0].replace('\\','/')+"?mode=ro")){
      try(var s=db.createStatement()){s.execute("PRAGMA query_only=ON");}
      System.out.print("{");boolean first=true;
      for(String table:new String[]{"stay_bookings","stay_requests","stay_history","room_operations"}){
        var digest=MessageDigest.getInstance("SHA-256");int count=0;
        try(var s=db.createStatement();var rows=s.executeQuery("SELECT * FROM "+table+" ORDER BY 1")){
          int columns=rows.getMetaData().getColumnCount();
          while(rows.next()){count++;for(int i=1;i<=columns;i++){
            String value=rows.getString(i);byte[] bytes=(value==null?"<null>":value).getBytes(StandardCharsets.UTF_8);
            digest.update((bytes.length+":").getBytes(StandardCharsets.UTF_8));digest.update(bytes);
          }}
        }
        if(!first)System.out.print(",");first=false;
        System.out.print("\""+table+"\":{\"rows\":"+count+",\"sha256\":\""+HexFormat.of().formatHex(digest.digest())+"\"}");
      }
      System.out.println("}");
    }
  }
}
