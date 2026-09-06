/**
 * システム全体で 0始まりの外部IDを1始まり（+1）に変換するかどうかのフラグ
 * 0始まりのままにしたい場合は、ここを false にするだけでシステム全体が切り替わります
 */
const SHOULD_OFFSET_ID = true;

/**
 * 外部の生ID（oud2など）を、データベース用のIDに変換する
 */
export function toDbId(externalId: number | string | undefined | null): number {
  if (externalId === undefined || externalId === null || externalId === '') {
    return 0; // またはエラーを投げる
  }
  
  const idNum = Number(externalId);
  return SHOULD_OFFSET_ID ? idNum + 1 : idNum;
}

/**
 * データベースのIDを、外部（フロントエンドや出力ファイル）用のIDに逆変換する
 */
export function toExternalId(dbId: number | undefined | null): number {
  if (dbId === undefined || dbId === null) {
    return 0;
  }
  return SHOULD_OFFSET_ID ? dbId - 1 : dbId;
}

/**
 * 上りの境界駅IDのような、逆転を伴う補正計算もここで一括管理すると安全
 */
export function getCorrectedBoundaryId(
  pointStationId: number,
  isNobori: boolean,
  totalStationCount: number
): number {
  // 1始まりの世界（SHOULD_OFFSET_ID = true）の場合の計算
  if (SHOULD_OFFSET_ID) {
    if (isNobori) {
      return totalStationCount - pointStationId;
    }
    return pointStationId + 1;
  }
  
  // 0始まりの世界（SHOULD_OFFSET_ID = false）の場合の計算
  if (isNobori) {
    return totalStationCount - pointStationId - 1;
  }
  return pointStationId;
}