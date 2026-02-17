export class Time {
    private hour: number;
    private minute: number;
    constructor(hour: number, minute: number) {
        this.hour = hour;
        this.minute = minute;
    }
    //文字列からTimeインスタンスを作成する
    public static fromString(timeString: string): Time | null {
        const trimmed = timeString.trim();
        if (trimmed === "") {
            return null;
        }
        if (!/^\d+$/.test(timeString)) {
            throw new Error('Invalid format: 時刻は数字のみで入力してください。');
        }
        const len = timeString.length;
        if (len !== 3 && len !== 4 && len !== 6) {
            console.log(timeString);
            throw new Error('Invalid format: 時刻は3桁(809)または4桁(1234)で入力してください。');
        }
        // slice(-2) は末尾2文字を取得、slice(0, -2) は開始から末尾2文字手前までを取得
        const minute = parseInt(timeString.slice(-2), 10);
        const hour = parseInt(timeString.slice(0, -2), 10);

        // 4. 数値としての妥当性チェック
        if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
            throw new Error(`Invalid time: ${hour}:${minute} は正しくない時刻です。`);
        }
        return new Time(hour, minute);
    }
    public toString(): string {
        if (this.hour < 10) {
            var paddedHour: string = " " + this.hour.toString().padStart(1, ' 0');
        } else {
            var paddedHour: string = this.hour.toString().padStart(2, '0');
        }
        //const paddedHour = this.hour.toString().padStart(2, '0');
        const paddedMinute = this.minute.toString().padStart(2, '0');
        return `${paddedHour}${paddedMinute}`;
    }

}
// 追加: Time を受け取って表示文字列を返すユーティリティ
export const formatTime = (value: Time | string | null | undefined): string => {
    if (value == null) return "";
    // Time インスタンスなら toString を利用
    if ((value as Time).toString && typeof (value as Time).toString === 'function' && !(typeof value === 'string')) {
        try {
            return (value as Time).toString();
        } catch {
            return String(value);
        }
    }
    // 文字列の場合、数値文字列なら Time.parse して整形、それ以外はそのまま返す
    if (typeof value === 'string') {
        const s = value.trim();
        // 数字だけの文字列なら Time.fromString を試す
        if (/^\d{3,4}$/.test(s)) {
            try {
                const t = Time.fromString(s);
                return t ? t.toString() : s;
            } catch {
                return s;
            }
        }
        return s;
    }
    // それ以外は string 化
    return String(value);
};