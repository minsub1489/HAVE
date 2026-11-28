package have.persistence;

/**
 * 파일 저장 계약 (컴포넌트 다이어그램 v2). 구현: StorageFileStore. 담당 A. 쓰는 곳은 02 Work뿐이다.
 * 결과물 PDF와 근거 파일을 비공개로 둔다. 키와 저장 위치는 응답에 싣지 않는다.
 */
public interface FileStore {

    void put(String key, byte[] file);

    /** 없으면 null */
    byte[] get(String key);

    void delete(String key);
}
