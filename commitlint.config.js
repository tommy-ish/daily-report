module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // 新機能
        'fix', // バグ修正
        'docs', // ドキュメントのみの変更
        'style', // コードの意味に影響を与えない変更（空白、フォーマット、セミコロンなど）
        'refactor', // バグ修正や機能追加ではないコードの変更
        'perf', // パフォーマンス改善
        'test', // テストの追加・修正
        'chore', // ビルドプロセスやツールの変更
        'revert', // コミットの取り消し
        'build', // ビルドシステムや外部依存関係の変更
        'ci', // CI設定ファイルやスクリプトの変更
      ],
    ],
    'subject-case': [0], // 件名の大文字小文字をチェックしない
    'subject-max-length': [2, 'always', 100], // 件名の最大文字数
    'body-max-line-length': [0], // 本文の行の最大文字数をチェックしない
  },
};
