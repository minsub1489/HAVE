package have.work.status;

import java.util.ArrayList;
import java.util.List;

/**
 * 옵서버 패턴의 Subject (디자인 패턴 문서 7장). 옵서버 목록을 가지고 변경을 알린다.
 * 옵서버는 서버 조립 지점(HaveServerBootstrap)에서만 등록한다. 02는 옵서버의 구현 클래스를 모른다.
 */
public abstract class Subject {

    private final List<WorkStatusObserver> observers = new ArrayList<>();

    public void addObserver(WorkStatusObserver observer) {
        observers.add(observer);
    }

    public void deleteObserver(WorkStatusObserver observer) {
        observers.remove(observer);
    }

    /** 등록된 순서대로 모든 옵서버에게 알린다. 옵서버가 예외를 던지면 그대로 올라가 상태 변경까지 롤백된다. */
    protected void notifyObservers() {
        for (WorkStatusObserver observer : observers) {
            observer.update((WorkStatusSubject) this);
        }
    }
}
