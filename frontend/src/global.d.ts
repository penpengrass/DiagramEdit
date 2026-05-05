// src/global.d.ts

// 副作用インポート (import "./style.css") や
// 標準的なCSSインポートに対応させる場合
declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}

// もし将来的にCSS Modules (import styles from "./style.module.css") を使う場合
/*declare module "*.module.css" {
  const classes: { [key: string]: string };
  export default classes;
}*/

// 必要に応じて画像やSCSSなどの定義もここに追加可能
declare module "*.svg";
declare module "*.png";
declare module "*.jpg";