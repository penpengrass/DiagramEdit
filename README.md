# DiagramEdit

## 概要

ローカルフォルダ内にあるOuDiaもしくはOuDiaSecondを開き、中身を閲覧できるWebアプリです。
mobileによって、スマホアプリとしても使用できます。
Web公開、スマホアプリ公開はしていないため、ローカルに取り込み、React+TypeScriptが動く環境で実行する形になります。

## 取り込み方法

- ソースコードをダウンロードorクローンする。

### Webアプリの場合

- frontend上、backend上でそれぞれ`npm install`を実行し、必要なライブラリをそろえる。
- データベースを使う場合、backend直下に.envファイルを置き、接続情報を記載する。
- frontend上で、`npm run dev`を実行、backend上で`npm run server`を実行。
- 一部機能はデータベースを使わずにWebアプリを使用することも可能。その場合はfrontend上の実行のみでよい。

### スマホアプリの場合

- mobileフォルダに移動し、`npm install`を実行し、必要なライブラリをそろえる。
- mobileフォルダ上で`npm expo start`を実行する。

## できること

- ローカル上のoud2ファイルを読み込み、内容を閲覧
- 駅一覧、列車種別一覧、列車時刻の閲覧、駅時刻表の閲覧、走行位置の閲覧
