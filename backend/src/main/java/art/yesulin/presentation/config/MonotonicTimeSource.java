package art.yesulin.presentation.config;

import org.springframework.stereotype.Component;

/** 요청 처리 시간 측정이 시스템 시각 보정의 영향을 받지 않게 하는 단조 증가 시간원이다. */
@Component
public class MonotonicTimeSource {

    public long nanoTime() {
        return System.nanoTime();
    }
}
