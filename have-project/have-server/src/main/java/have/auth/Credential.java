package have.auth;

/** 로그인 입력. 이메일이 로그인 ID다(USER.email, UNIQUE). */
public class Credential {

    private final String email;
    private final String password;

    public Credential(String email, String password) {
        this.email = email;
        this.password = password;
    }

    public String getEmail() {
        return email;
    }

    public String getPassword() {
        return password;
    }
}
