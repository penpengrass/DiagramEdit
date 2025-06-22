//駅に関する情報をすべてここに入れる
//駅規模を書き換える[]内にEkikiboが入り、:の後に日本語名を入れるという形になっている。別のところに応用できそう
export interface RailNumber {
    id: number;
    name: string;
    ryakushou: string;
}
export interface Station {
    id: number;
    name: string;
    main: string;
    layout: string;
    railnumber: RailNumber[];
}

export const layoutNameMap: { [key: string]: { label: string; values: number[] } } = {
  Jikokukeisiki_Hatsu: { label: "発時刻", values: [0, 1, 0, 1] },
  Jikokukeisiki_Chaku: { label: "着時刻", values: [1, 0, 1, 0] },
  Jikokukeisiki_Hatsuchaku: { label: "発着", values: [1, 1, 1, 1] },
  Jikokukeisiki_NoboriChaku: { label: "上り着時刻", values: [0, 1, 1, 0] },
  Jikokukeisiki_KudariChaku: { label: "下り着時刻", values: [1, 0, 0, 1] },
  Jikokukeisiki_NoboriHatsuchaku: { label: "上り発着", values: [0, 1, 1, 1] },
  Jikokukeisiki_KudariHatsuchaku: { label: "下り発着", values: [1, 1, 0, 1] },
};

export const mainNameMap: { [key: string]: { label: string; value: number } } = {
  Ekikibo_Ippan: { label: "一般駅", value: 0 },
  Ekikibo_Syuyou: { label: "主要駅", value: 1 }
};