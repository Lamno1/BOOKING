package com.stayos.auth;

import java.nio.charset.StandardCharsets;
import java.security.*;
import java.sql.*;
import java.util.*;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import com.stayos.booking.BookingService.Failure;

/** SQLite accounts with PBKDF2 passwords and hashed, expiring session tokens. */
public final class AuthService implements AutoCloseable {
  private static final int ITERATIONS = 600_000;
  private final Connection connection;
  private final SecureRandom random = new SecureRandom();

  /** Passwords that only ever existed for demos; an admin still using one must change it before the site goes public. */
  private static final List<String> KNOWN_DEFAULTS=List.of("change-me-now","stayos-demo");

  public AuthService(String url) throws SQLException {
    this(url, System.getenv("STAYOS_ADMIN_EMAIL"), System.getenv("STAYOS_ADMIN_PASSWORD"), Boolean.parseBoolean(System.getenv("STAYOS_DEMO")));
  }
  public AuthService(String url, String adminEmail, String adminPassword, boolean demo) throws SQLException {
    if(adminPassword!=null && adminPassword.length()<12)throw new IllegalArgumentException("STAYOS_ADMIN_PASSWORD must contain at least 12 characters.");
    if(adminPassword!=null && (adminEmail==null||adminEmail.isBlank()))throw new IllegalArgumentException("Set STAYOS_ADMIN_EMAIL together with STAYOS_ADMIN_PASSWORD.");
    connection=DriverManager.getConnection(url);
    migrate();
    if(adminPassword!=null || demo)seed(adminEmail!=null&&!adminEmail.isBlank()?adminEmail:"admin@stayos.demo",adminPassword!=null?adminPassword:"change-me-now","admin","STAYOS Administrator");
    if(demo)seed("guest@stayos.demo","stayos-demo","guest","StayOS Guest");
  }
  private void migrate() throws SQLException {
    try(var s=connection.createStatement()){
      s.execute("PRAGMA busy_timeout=5000");
      s.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password_hash TEXT, salt TEXT, role TEXT NOT NULL DEFAULT 'guest', display_name TEXT NOT NULL DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP)");
    }
    addColumn("password_hash","TEXT");addColumn("salt","TEXT");addColumn("display_name","TEXT NOT NULL DEFAULT ''");addColumn("created_at","TEXT");addColumn("role","TEXT NOT NULL DEFAULT 'guest'");
    addColumn("status","TEXT NOT NULL DEFAULT 'ACTIVE'");
    if(hasColumn("password")){
      // Migrate legacy rows before removing the old plaintext column, including NOT NULL schemas.
      var legacy=new ArrayList<String[]>();
      try(var s=connection.createStatement();var r=s.executeQuery("SELECT id,password FROM users WHERE password_hash IS NULL OR password_hash=''")){
        while(r.next())legacy.add(new String[]{r.getString(1),r.getString(2)});
      }
      for(var row:legacy){String salt=salt();try(var s=connection.prepareStatement("UPDATE users SET password_hash=?,salt=? WHERE id=?")){
        s.setString(1,hash(row[1]==null?UUID.randomUUID().toString():row[1],salt));s.setString(2,salt);s.setString(3,row[0]);s.executeUpdate();
      }}
      try(var s=connection.createStatement()){s.execute("ALTER TABLE users DROP COLUMN password");}
    }
    try(var s=connection.createStatement()){
      s.execute("CREATE TABLE IF NOT EXISTS auth_sessions (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires_at INTEGER NOT NULL)");
      s.execute("CREATE TABLE IF NOT EXISTS password_resets (email TEXT PRIMARY KEY, code_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, issued_by TEXT NOT NULL)");
      s.execute("CREATE TABLE IF NOT EXISTS account_audit (id INTEGER PRIMARY KEY, actor TEXT NOT NULL, target TEXT NOT NULL, status TEXT NOT NULL, at INTEGER NOT NULL)");
      s.execute("DELETE FROM auth_sessions WHERE expires_at<"+System.currentTimeMillis());
    }
  }
  private boolean hasColumn(String name)throws SQLException{try(var s=connection.createStatement();var r=s.executeQuery("PRAGMA table_info(users)")){while(r.next())if(name.equals(r.getString("name")))return true;}return false;}
  private void addColumn(String name,String type)throws SQLException{if(!hasColumn(name))try(var s=connection.createStatement()){s.execute("ALTER TABLE users ADD COLUMN "+name+" "+type);}}
  private void seed(String email,String password,String role,String name)throws SQLException{
    String salt=salt();
    // Never replace passwords or promote a pre-existing guest on server restart.
    try(var s=connection.prepareStatement("INSERT OR IGNORE INTO users(email,password_hash,salt,role,display_name) VALUES(?,?,?,?,?)")){
      s.setString(1,email.trim().toLowerCase(Locale.ROOT));s.setString(2,hash(password,salt));s.setString(3,salt);s.setString(4,role);s.setString(5,name);s.executeUpdate();
    }
  }
  // PBKDF2 takes ~0.2 s on purpose; it runs outside the connection lock so one login never stalls every other request.
  public Optional<Session> login(String email,String password){
    if(email==null||password==null||password.length()>256||email.length()>254)return Optional.empty();
    String normalized=email.trim().toLowerCase(Locale.ROOT);
    if(lockedOut(normalized))throw new Failure(429,"Tài khoản tạm khóa đăng nhập 15 phút do nhập sai nhiều lần.");
    String[] row;
    synchronized(this){
      try(var s=connection.prepareStatement("SELECT email,password_hash,salt,role,display_name FROM users WHERE email=? AND status='ACTIVE'")){
        s.setString(1,normalized);
        try(var r=s.executeQuery()){row=r.next()?new String[]{r.getString(1),r.getString(2),r.getString(3),r.getString(4),r.getString(5)}:null;}
      }catch(SQLException e){throw new IllegalStateException("Account storage unavailable",e);}
    }
    // Unknown accounts still pay for one hash so response time does not reveal which emails exist.
    boolean valid=row!=null&&verify(password,row[2],row[1]);
    if(row==null)hash(password,DUMMY_SALT);
    if(!valid){failed(normalized);return Optional.empty();}
    failures.remove(normalized);
    var user=new User(row[0],row[3],row[4]);
    byte[] bytes=new byte[32];random.nextBytes(bytes);
    String token=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);long expires=System.currentTimeMillis()+86_400_000L;
    synchronized(this){
      try(var insert=connection.prepareStatement("INSERT INTO auth_sessions VALUES(?,?,?)")){insert.setString(1,tokenHash(token));insert.setString(2,user.email());insert.setLong(3,expires);insert.executeUpdate();}
      catch(SQLException e){throw new IllegalStateException("Account storage unavailable",e);}
    }
    return Optional.of(new Session(token,user,expires));
  }
  private static final String DUMMY_SALT=Base64.getEncoder().encodeToString(new byte[16]);
  private static final int MAX_FAILURES=8;private static final long LOCK_MS=15*60_000L;
  private final Map<String,long[]> failures=new java.util.concurrent.ConcurrentHashMap<>();
  /** Per-account brake on password guessing that an attacker cannot dodge by rotating IP addresses. */
  private boolean lockedOut(String email){var f=failures.get(email);if(f==null)return false;if(System.currentTimeMillis()-f[1]>LOCK_MS){failures.remove(email);return false;}return f[0]>=MAX_FAILURES;}
  private void failed(String email){
    long now=System.currentTimeMillis();
    failures.compute(email,(k,f)->f==null||now-f[1]>LOCK_MS?new long[]{1,now}:new long[]{f[0]+1,now});
    if(failures.size()>10_000)failures.entrySet().removeIf(e->now-e.getValue()[1]>LOCK_MS);
  }
  public Optional<User> register(String email,String password,String name){
    if(email==null||email.length()>254||!email.trim().matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")||password==null||password.length()<8||password.length()>256||name==null||name.isBlank()||name.length()>80)return Optional.empty();
    String normalized=email.trim().toLowerCase(Locale.ROOT),salt=salt(),hash=hash(password,salt);
    synchronized(this){
      try(var s=connection.prepareStatement("INSERT INTO users(email,password_hash,salt,role,display_name) VALUES(?,?,?,'guest',?)")){
        s.setString(1,normalized);s.setString(2,hash);s.setString(3,salt);s.setString(4,name.trim());s.executeUpdate();
        return Optional.of(new User(normalized,"guest",name.trim()));
      }catch(SQLException e){if(e.getErrorCode()==19)return Optional.empty();throw new IllegalStateException("Account storage unavailable",e);}
    }
  }
  public synchronized Optional<User> authenticate(String token){
    if(token==null||token.length()>128)return Optional.empty();
    try(var s=connection.prepareStatement("SELECT u.email,u.role,u.display_name FROM auth_sessions a JOIN users u ON a.email=u.email WHERE a.token_hash=? AND a.expires_at>? AND u.status='ACTIVE'")){
      s.setString(1,tokenHash(token));s.setLong(2,System.currentTimeMillis());
      try(var r=s.executeQuery()){return r.next()?Optional.of(new User(r.getString(1),r.getString(2),r.getString(3))):Optional.empty();}
    }catch(SQLException e){throw new IllegalStateException("Account storage unavailable",e);}
  }
  public boolean changePassword(User user,String current,String next)throws SQLException{
    if(current==null||current.length()>256||next==null||next.length()<12||next.length()>256)return false;
    String salt,stored;
    synchronized(this){
      try(var s=connection.prepareStatement("SELECT salt,password_hash FROM users WHERE email=?")){
        s.setString(1,user.email());try(var r=s.executeQuery()){if(!r.next())return false;salt=r.getString(1);stored=r.getString(2);}
      }
    }
    if(!verify(current,salt,stored))return false;
    String fresh=salt(),hash=hash(next,fresh);
    synchronized(this){
      connection.setAutoCommit(false);
      try{
        try(var s=connection.prepareStatement("UPDATE users SET password_hash=?,salt=? WHERE email=? AND password_hash=?")){s.setString(1,hash);s.setString(2,fresh);s.setString(3,user.email());s.setString(4,stored);if(s.executeUpdate()!=1){connection.rollback();return false;}}
        try(var s=connection.prepareStatement("DELETE FROM auth_sessions WHERE email=?")){s.setString(1,user.email());s.executeUpdate();}
        connection.commit();return true;
      }catch(SQLException e){connection.rollback();throw e;}finally{connection.setAutoCommit(true);}
    }
  }
  /** Admin accounts whose password is still a published demo default. Checked at start-up before serving the public. */
  public synchronized List<String> adminsWithDefaultPassword(){
    var found=new ArrayList<String>();
    try(var s=connection.createStatement();var r=s.executeQuery("SELECT email,salt,password_hash FROM users WHERE role='admin' AND status='ACTIVE'")){
      while(r.next())for(String candidate:KNOWN_DEFAULTS)if(verify(candidate,r.getString(2),r.getString(3))){found.add(r.getString(1));break;}
    }catch(SQLException e){throw new IllegalStateException("Account storage unavailable",e);}
    return found;
  }
  /** Expired sessions are dropped hourly, not only at start-up. */
  public synchronized int purgeExpiredSessions(){
    try(var s=connection.prepareStatement("DELETE FROM auth_sessions WHERE expires_at<?")){s.setLong(1,System.currentTimeMillis());return s.executeUpdate();}
    catch(SQLException e){throw new IllegalStateException("Account storage unavailable",e);}
  }
  public synchronized List<Map<String,Object>> users(User actor)throws SQLException{
    if(!"admin".equals(actor.role()))throw new Failure(403,"Bạn không có quyền quản trị.");
    var result=new ArrayList<Map<String,Object>>();
    try(var s=connection.createStatement();var r=s.executeQuery("SELECT email,display_name,role,status,COALESCE(created_at,'') FROM users ORDER BY id DESC")){
      while(r.next())result.add(Map.of("email",r.getString(1),"displayName",r.getString(2),"role",r.getString(3),"status",r.getString(4),"createdAt",r.getString(5)));
    }return result;
  }
  public synchronized void setStatus(User actor,String email,String status)throws SQLException{
    if(!"admin".equals(actor.role()))throw new Failure(403,"Bạn không có quyền quản trị.");
    if(!Set.of("ACTIVE","SUSPENDED").contains(status))throw new Failure(400,"Trạng thái tài khoản chưa hợp lệ.");
    email=email.trim().toLowerCase(Locale.ROOT);
    connection.setAutoCommit(false);
    try{
      try(var s=connection.prepareStatement("SELECT role FROM users WHERE email=?")){
        s.setString(1,email);try(var r=s.executeQuery()){
          if(!r.next())throw new Failure(404,"Không tìm thấy tài khoản.");
          if(!"guest".equals(r.getString(1)))throw new Failure(403,"Không thay đổi tài khoản quản trị tại đây.");
        }
      }
      try(var s=connection.prepareStatement("UPDATE users SET status=? WHERE email=?")){s.setString(1,status);s.setString(2,email);s.executeUpdate();}
      if(status.equals("SUSPENDED"))try(var s=connection.prepareStatement("DELETE FROM auth_sessions WHERE email=?")){s.setString(1,email);s.executeUpdate();}
      try(var s=connection.prepareStatement("INSERT INTO account_audit(actor,target,status,at) VALUES(?,?,?,?)")){s.setString(1,actor.email());s.setString(2,email);s.setString(3,status);s.setLong(4,System.currentTimeMillis());s.executeUpdate();}
      connection.commit();
    }catch(SQLException|RuntimeException e){connection.rollback();throw e;}finally{connection.setAutoCommit(true);}
  }
  // ---- Staff-assisted password reset (no mail service yet) ----
  // The guest calls the hotline, staff confirm who they are, and issue a one-time code valid for 30 minutes.
  private static final long RESET_MS=30*60_000L;
  private static final String RESET_ALPHABET="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  /** Admin only. Returns the plain code once; only its hash is stored. A new code replaces the previous one. */
  public synchronized String issueResetCode(User actor,String email)throws SQLException{
    if(!"admin".equals(actor.role()))throw new Failure(403,"Bạn không có quyền quản trị.");
    String target=email==null?"":email.trim().toLowerCase(Locale.ROOT);
    try(var s=connection.prepareStatement("SELECT role FROM users WHERE email=?")){
      s.setString(1,target);try(var r=s.executeQuery()){if(!r.next())throw new Failure(404,"Không tìm thấy tài khoản.");if(!"guest".equals(r.getString(1)))throw new Failure(403,"Không cấp mã cho tài khoản quản trị tại đây.");}
    }
    var code=new StringBuilder();for(int i=0;i<10;i++)code.append(RESET_ALPHABET.charAt(random.nextInt(RESET_ALPHABET.length())));
    try(var s=connection.prepareStatement("INSERT INTO password_resets VALUES(?,?,?,?) ON CONFLICT(email) DO UPDATE SET code_hash=excluded.code_hash,expires_at=excluded.expires_at,issued_by=excluded.issued_by")){
      s.setString(1,target);s.setString(2,tokenHash(code.toString()));s.setLong(3,System.currentTimeMillis()+RESET_MS);s.setString(4,actor.email());s.executeUpdate();
    }
    try(var s=connection.prepareStatement("INSERT INTO account_audit(actor,target,status,at) VALUES(?,?,?,?)")){s.setString(1,actor.email());s.setString(2,target);s.setString(3,"RESET_CODE_ISSUED");s.setLong(4,System.currentTimeMillis());s.executeUpdate();}
    return code.toString();
  }
  /** Sets a new password with a valid code. Wrong codes count toward the same lockout as wrong passwords. */
  public boolean resetWithCode(String email,String code,String next){
    if(email==null||code==null||next==null||next.length()<12||next.length()>256||code.length()>20)return false;
    String target=email.trim().toLowerCase(Locale.ROOT);
    if(lockedOut(target))throw new Failure(429,"Tài khoản tạm khóa 15 phút do nhập sai nhiều lần.");
    String salt=salt(),hash=hash(next,salt);
    synchronized(this){
      try{
        connection.setAutoCommit(false);
        try{
          try(var s=connection.prepareStatement("DELETE FROM password_resets WHERE email=? AND code_hash=? AND expires_at>?")){
            s.setString(1,target);s.setString(2,tokenHash(code.trim().toUpperCase(Locale.ROOT)));s.setLong(3,System.currentTimeMillis());
            if(s.executeUpdate()!=1){connection.rollback();failed(target);return false;}
          }
          try(var s=connection.prepareStatement("UPDATE users SET password_hash=?,salt=? WHERE email=? AND role='guest'")){s.setString(1,hash);s.setString(2,salt);s.setString(3,target);if(s.executeUpdate()!=1){connection.rollback();return false;}}
          try(var s=connection.prepareStatement("DELETE FROM auth_sessions WHERE email=?")){s.setString(1,target);s.executeUpdate();}
          connection.commit();failures.remove(target);return true;
        }catch(SQLException|RuntimeException e){connection.rollback();throw e;}
        finally{connection.setAutoCommit(true);}
      }catch(SQLException e){throw new IllegalStateException("Account storage unavailable",e);}
    }
  }
  public synchronized void logout(String token){if(token==null)return;try(var s=connection.prepareStatement("DELETE FROM auth_sessions WHERE token_hash=?")){s.setString(1,tokenHash(token));s.executeUpdate();}catch(SQLException e){throw new IllegalStateException(e);}}
  private boolean verify(String password,String salt,String stored){
    try{return MessageDigest.isEqual(HexFormat.of().parseHex(hash(password,salt)),HexFormat.of().parseHex(stored));}catch(IllegalArgumentException|NullPointerException e){return false;}
  }
  private String salt(){byte[] bytes=new byte[16];random.nextBytes(bytes);return Base64.getEncoder().encodeToString(bytes);}
  private String hash(String password,String salt){
    var spec=new PBEKeySpec(password.toCharArray(),Base64.getDecoder().decode(salt),ITERATIONS,256);
    try{return HexFormat.of().formatHex(SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded());}
    catch(GeneralSecurityException e){throw new IllegalStateException(e);}finally{spec.clearPassword();}
  }
  private String tokenHash(String token){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));}catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}}
  @Override public synchronized void close()throws SQLException{connection.close();}
  public record User(String email,String role,String displayName){}
  public record Session(String token,User user,long expiresAt){}
}
