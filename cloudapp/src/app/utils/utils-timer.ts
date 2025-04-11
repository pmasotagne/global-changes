export interface ITimer {
    elapsedMinutes: number;
    elapsedSeconds: number;
    startTimer(): void;
    stopTimer(): void;
}

export class Timer implements ITimer {
    private intervalId: any = null;
    elapsedMinutes: number = 0;
    elapsedSeconds: number = 0;
  
    startTimer(): void {
        this.elapsedMinutes = 0;
        this.elapsedSeconds = 0;
  
        this.intervalId = setInterval(() => {
            this.elapsedSeconds++;
  
            if (this.elapsedSeconds === 60) {
                this.elapsedMinutes++;
                this.elapsedSeconds = 0;
            }
        }, 1000);
    }
  
    stopTimer(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    public sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
