import { BITE_UNIT_ECONOMICS } from '@/content/company';
import type { FieldText, ScenarioText, Translations } from '@/content/localize';

/**
 * The Sales scenario in other languages, addressed by the keys in
 * `scenario.ts`. Numbers are read from the same constants the English uses, so
 * a translation can never quote a different price. See `localize.ts`.
 */

const e = BITE_UNIT_ECONOMICS;

const DECISION_AFFECTED_OPTIONS_JA: Record<string, string> = {
  price: '価格',
  store_count: '店舗数',
  test_region: 'テスト地域',
  quantity: '数量',
  promotion: '販促',
  shelf_placement: '棚の配置',
  reorder_rule: '追加発注のルール',
  risk_sharing: 'リスク分担',
  other: 'その他',
};

const PRODUCT_REFERENCE_JA = {
  alt: 'BITE Protein Drink のチョコレート、バニラビーン、ストロベリー、抹茶',
  title: 'BITE Protein Drink',
  caption: '330 ml・たんぱく質 20 g・要冷蔵・賞味期限 30 日',
  facts: [
    { label: '希望小売価格', value: `¥${e.recommendedRetailPriceYen}` },
    { label: '標準卸価格', value: `¥${e.standardWholesalePriceYen}` },
    { label: '基本貢献利益', value: `¥${e.baseContributionYen}/本` },
  ],
};

const ACCOUNT_REFERENCE_JA = {
  alt: '夕暮れの QuickMart の店舗',
  title: 'QuickMart',
  caption: '日本のコンビニエンスストアチェーン・約 1,200 店舗',
  facts: [
    { label: '18〜29歳の構成比', value: '31%' },
    { label: '朝の売上構成比', value: '18%' },
    { label: '冷蔵品の廃棄率', value: '4.2%' },
  ],
};

const PROPOSAL_FIELDS_JA: Record<string, FieldText> = {
  test_region: {
    label: 'テスト地域',
    placeholder: '例：関西、全国、東京のオフィス街',
    helpText:
      'データルームのパイロット案は判断材料です。自分で独自の構成を設計しても構いません。',
  },
  store_count: {
    label: '店舗数',
    helpText: 'QuickMart の店舗数は全体で約 1,200 店です。',
  },
  initial_quantity: {
    label: '初回数量（本）',
    helpText: 'BITE の最小生産ロットは 2,400 本です。',
  },
  wholesale_price_yen: {
    label: '卸価格（円 / 本）',
    helpText: 'QuickMart 向けの標準卸価格は ¥178 です。',
  },
  retail_price_yen: {
    label: '小売価格（円 / 本）',
    helpText: '希望小売価格は ¥298 です。',
  },
  extra_promotion_yen: {
    label: '追加の販促支援（円 / 本）',
    helpText:
      'コスト構造にすでに含まれる基本販促費 ¥12 への上乗せです。タダではありません。BITE の貢献利益が減ります。',
  },
  target_customer: { label: 'ターゲット顧客' },
  shelf_or_placement_strategy: { label: '棚・配置の戦略' },
  promotion_plan: { label: '販促計画' },
  bite_support: {
    label: 'BITE の支援',
    helpText: '商品を納める以外に、うまくいくよう BITE が何をするか。',
  },
  sales_target_units_per_store_per_day: { label: '販売目標（本 / 店 / 日）' },
  reorder_or_expansion_rule: {
    label: '追加発注・拡大のルール',
    helpText: 'どの数値がどうなったら、このパイロットを継続・拡大しますか？',
  },
  expected_volume: {
    label: '想定販売数量',
    helpText: '算出方法も示してください：店舗数 × 本 / 店 / 日 × 日数。',
  },
  quickmart_economics_summary: {
    label: 'QuickMart にとっての採算',
    helpText: 'この取引が QuickMart にとってどれだけの価値になるか（利益率と利益額）。',
  },
  bite_contribution_summary: { label: 'BITE の貢献利益' },
  customer_value_summary: {
    label: '顧客価値のまとめ',
    helpText: '特徴 → 顧客にとっての便益 → ビジネスへの影響 → 根拠。',
  },
  key_risk: { label: '主なリスク' },
  risk_mitigation: { label: 'リスクへの対策' },
};

export const SALES_SCENARIO_TRANSLATIONS: Translations<ScenarioText> = {
  ja: {
    title: 'BITE Protein Drink × QuickMart',
    studentRole: '流通営業 ジュニア担当',
    mission: 'BITE Protein Drink を、採算の取れる条件で QuickMart に採用してもらう。',
    finalOutputTitle: 'QuickMart 最終営業提案書',
    steps: {
      'sales-training': {
        title: '営業トレーニング',
        summary: '仕事を始める前に、営業のプロの考え方を学びます。',
        instructions:
          '「営業スターターガイド」を読んでから、トレーニングを完了にしてください。任意のセルフチェックはあなた自身のためのもので、スキルの根拠として使われることはありません。',
        tasks: {
          'training-review': {
            title: '営業スターターガイドを読む',
            instructions:
              '下のパネルで「営業スターターガイド」を開いてください。読み終えたら、トレーニングを完了にします。',
          },
          'training-self-check': {
            title: '任意のセルフチェック',
            instructions:
              '採点はされず、SKILL FIT の根拠にも使われません。自分の理解を確かめるためだけのものです。',
            fields: {
              q_hypothesis: {
                label: '仮説とは…',
                options: {
                  a: 'バイヤーに示せる事実',
                  b: 'まだ検証が必要な暫定的な見立て',
                  c: 'ビジネス目標と同じもの',
                },
              },
              q_request: {
                label: 'バイヤーに「価格が高すぎる」と言われました。最初にすべきことは…',
                options: {
                  a: '価格を下げる',
                  b: 'その反論の裏に実際に何があるのかを探る',
                  c: '商談を打ち切る',
                },
              },
              q_deal: {
                label: '成約した取引は…',
                options: {
                  a: 'いつでも良い結果である',
                  b: '双方にとって採算が合う場合にだけ良い結果である',
                },
              },
            },
          },
        },
      },

      onboarding: {
        title: 'オンボーディング — BITE と製品を理解する',
        summary: 'マネージャーに会い、自分が何を売るのかを知ります。',
        instructions:
          'BITE、製品シート、QuickMart の概要を確認してください。そのうえで、BITE Protein Drink の営業上の強みを3つ挙げます。それぞれの根拠と、なぜこの取引先にとって重要かもしれないかを添えてください。',
        media: PRODUCT_REFERENCE_JA,
        tasks: {
          'product-strengths': {
            title: '3つの営業上の強み',
            instructions:
              '強みは、このバイヤーにとって何かをもたらして初めて強みになります。「たんぱく質 20 g」は特徴です。それが QuickMart にとって何の価値になるかが強みです。',
            fields: {
              strengths: {
                label: '営業上の強み',
                fields: {
                  strength: { label: '強み' },
                  evidence: {
                    label: '根拠',
                    helpText: 'これはどこから来た情報ですか？資料名か数値を挙げてください。',
                  },
                  why_it_may_matter_to_quickmart: {
                    label: 'QuickMart にとって重要かもしれない理由',
                  },
                },
              },
            },
          },
        },
      },

      'account-research': {
        title: '取引先リサーチ',
        summary: 'QuickMart について、商談前の取引先仮説を立てます。',
        instructions:
          'データルームで作業します。根拠を示せることと推測していることを分けてください。商談はその推測を確かめるためにあります。',
        media: ACCOUNT_REFERENCE_JA,
        tasks: {
          'account-analysis-memo': {
            title: '取引先分析メモ',
            instructions:
              '仮説は事実ではありません。「仮説」と表示された項目はあなたの解釈で、商談で確かめることになります。',
            fields: {
              business_goals: {
                label: 'ビジネス目標（3つ）',
                helpText: 'QuickMart が最終的に実現したいことは何ですか？',
                fields: {
                  goal: { label: '目標' },
                  evidence: { label: '根拠' },
                },
              },
              likely_problems: {
                label: '想定される課題（3つ）',
                helpText: 'その目標を妨げているものは何ですか？',
                fields: {
                  problem_hypothesis: { label: '課題の仮説' },
                  evidence: { label: '根拠' },
                  why_it_matters: { label: 'なぜ重要か' },
                },
              },
              top_account_hypothesis: { label: '最も重要な取引先仮説（任意）' },
              what_must_be_validated_in_meeting: { label: '商談で確かめるべきこと（任意）' },
            },
          },
        },
      },

      'meeting-prep': {
        title: 'バイヤー商談の準備',
        summary: '提案を実際に変えうる質問を書きます。',
        instructions:
          'Yuki Tanaka さんへの質問を5つ用意してください。それぞれについて、目的と、答えによってどの判断が変わるかを書きます。どの判断も変えない答えしか返ってこない質問は、ただの雑談です。',
        tasks: {
          'buyer-questions': {
            title: 'バイヤーへの5つの質問',
            fields: {
              questions: {
                label: '質問',
                fields: {
                  question: { label: '質問' },
                  purpose: { label: '目的' },
                  decision_affected: {
                    label: '影響する判断',
                    options: DECISION_AFFECTED_OPTIONS_JA,
                  },
                },
              },
            },
          },
        },
      },

      'buyer-meeting': {
        title: 'AI バイヤー商談',
        summary: 'QuickMart の飲料カテゴリーバイヤー、Yuki Tanaka さんに会います。',
        instructions:
          'Yuki さんは知っていることを自分から全部は話しません。具体的な数字は、その数字が表すことについて質問したときに出てきます。用意した質問は会話の横に表示されますが、相手が実際に言ったことに沿って進めてください。',
        media: ACCOUNT_REFERENCE_JA,
        tasks: {
          'buyer-meeting-conversation': { title: 'Yuki Tanaka さんとの商談' },
        },
      },

      'needs-analysis': {
        title: 'ニーズ分析',
        summary: '会話の内容を、構造化された顧客診断にまとめます。',
        instructions:
          'QuickMart が望むこと → それを妨げるもの → 必要なもの → 判断を制約するもの → 恐れているリスク。口にされた要望が、そのまま本当のニーズとは限りません。',
        tasks: {
          'needs-analysis': {
            title: '顧客診断',
            fields: {
              goal: { label: '目標 — QuickMart が望むこと' },
              problem: { label: '課題 — それを妨げるもの' },
              need: { label: 'ニーズ — それを解決するために必要なもの' },
              constraint: { label: '制約 — 変えにくいこと' },
              risk: { label: 'リスク — うまくいかないと恐れていること' },
              top_need_1: { label: '最重要ニーズ #1' },
              top_need_2: { label: '最重要ニーズ #2（任意）' },
              evidence_summary: {
                label: '根拠のまとめ',
                helpText: 'この診断を裏づける、実際に聞いたこと・読んだことは何ですか？',
              },
              evidence_refs: {
                label: '根拠をひもづける',
                helpText: 'この診断のもとになったデータルームの資料とバイヤーの発言を選んでください。',
              },
            },
          },
        },
      },

      'proposal-v1': {
        title: '初回営業提案',
        summary: '採算の取れるパイロット提案を設計します。',
        instructions:
          '計算ツールは採算を示すだけで、判断はしません。ガードレールの警告はあくまで警告です。提案を決めるのはあなたです。',
        media: PRODUCT_REFERENCE_JA,
        tasks: {
          'proposal-v1': {
            title: '提案 v1',
            fields: PROPOSAL_FIELDS_JA,
          },
        },
      },

      'unexpected-event': {
        title: '想定外の出来事',
        summary: '新しい情報が届きました。何を変え、何を維持するかを決めます。',
        instructions:
          '価格は多くの変数のひとつにすぎません。何を変えて何を維持するかを意図して決め、どちらについても理由を説明できるようにしてください。',
        eventPayload: {
          headline: 'QuickMart：競合の価格と展開リスクについて',
          from: 'Yuki Tanaka — QuickMart 飲料カテゴリーバイヤー',
          body: 'ご提案をいただいてから、状況が2点変わりました。\n\nまず、FitDrink から御社より ¥20 安い卸価格の再提示がありました。次に、社内では、認知度の低いブランドをいきなり全国展開することに不安の声が出ています。当社が負うリスクとしては大きすぎると感じています。\n\n先に進む前に、どう対応されるおつもりかを伺いたいと思います。',
          facts: [
            { label: '競合', value: 'FitDrink' },
            { label: '競合との卸価格差', value: 'BITE より ¥20 安い' },
            { label: '示された懸念', value: '認知度の低いブランドの全国展開はリスクが大きすぎる' },
          ],
        },
        tasks: {
          'event-acknowledge': { title: 'メッセージを読む' },
          'proposal-v2-revision': {
            title: '見直しの判断',
            instructions:
              '提案 v1 はそのまま保存され、このフォームの横に表示されます。ここでの入力で上書きされることはありません。',
            fields: {
              conditions_to_change: { label: '変える条件' },
              conditions_to_keep: { label: '維持する条件' },
              why_change: { label: '変える理由' },
              why_keep: { label: '維持する理由' },
              response_to_competitor: {
                label: '競合への対応',
                helpText: '価格を合わせるのは選択肢のひとつにすぎません。必須ではありません。',
              },
              how_to_reduce_quickmart_risk: { label: 'QuickMart のリスクをどう減らすか' },
              proposal_v2_summary: { label: '提案 v2 のまとめ' },
            },
          },
        },
      },

      negotiation: {
        title: '最終交渉',
        summary: 'Yuki Tanaka さんと最終的な条件パッケージを交渉します。',
        instructions:
          'すべてが交渉の対象です。価格、数量、店舗数、販促、サンプリング、データ共有、返品条件、追加発注の条件、支払条件。実際に合意したパッケージを記録してください。BITE がガードレールと照らし合わせて確認します。',
        media: PRODUCT_REFERENCE_JA,
        tasks: {
          'negotiation-conversation': { title: 'Yuki Tanaka さんとの交渉' },
          'final-agreed-package': {
            title: '最終合意パッケージ',
            instructions:
              'Yuki さんと実際にたどり着いた条件を記録してください。文章ではなく構造化されたデータで、BITE がレビューするのはここです。',
            fields: {
              wholesale_price_yen: { label: '卸価格（円 / 本）' },
              retail_price_yen: { label: '小売価格（円 / 本）' },
              extra_promotion_yen: { label: '追加の販促支援（円 / 本）' },
              test_region: { label: 'テスト地域' },
              store_count: { label: '店舗数' },
              initial_quantity: { label: '初回数量（本）' },
              promotion_terms: { label: '販促条件' },
              sampling: { label: 'サンプリング' },
              data_sharing: { label: 'データ共有' },
              return_terms: {
                label: '売れ残り・返品の条件',
                helpText: 'BITE は全量返品保証を提供できません。',
              },
              reorder_conditions: { label: '追加発注・拡大の条件' },
              payment_terms_days: {
                label: '支払条件（日）',
                helpText: 'BITE が受け入れられるのは最長 45 日です。',
              },
              agreement_status: {
                label: '交渉の着地点',
                options: {
                  agreed: '基本合意',
                  agreed_with_open_points: '未決事項ありで合意',
                  not_agreed: '合意に至らず — 提案を見直す',
                },
              },
            },
          },
        },
      },

      'final-submission': {
        title: '最終提出',
        summary: 'QuickMart 最終営業提案書を提出します。',
        instructions:
          '各セクションには、これまでのあなたの作業があらかじめ入っています。表現は自由に直してください。提出すると、変更できないスナップショットとして保存されます。',
        tasks: {
          'final-proposal': {
            title: 'QuickMart 最終営業提案書',
            fields: {
              quickmart_needs: {
                label: '1. QuickMart のニーズ',
                prefillTemplate:
                  '目標：{{needs-analysis.goal}}\n課題：{{needs-analysis.problem}}\nニーズ：{{needs-analysis.need}}\n最重要ニーズ：{{needs-analysis.top_need_1}}',
              },
              bite_value_proposition: { label: '2. BITE の価値提案' },
              pilot_structure: {
                label: '3. パイロット / テストの構成',
                prefillTemplate:
                  '地域：{{final-agreed-package.test_region}}\n店舗数：{{final-agreed-package.store_count}}\n追加発注・拡大：{{final-agreed-package.reorder_conditions}}',
              },
              price_and_quantity: {
                label: '4. 卸価格 / 小売価格 / 数量',
                prefillTemplate:
                  '卸価格：¥{{final-agreed-package.wholesale_price_yen}}\n小売価格：¥{{final-agreed-package.retail_price_yen}}\n初回数量：{{final-agreed-package.initial_quantity}} 本',
              },
              expected_sales_and_economics: {
                label: '5. 想定売上と採算',
                prefillTemplate:
                  '{{proposal-v1.expected_volume}}\n\nQuickMart：{{proposal-v1.quickmart_economics_summary}}\nBITE：{{proposal-v1.bite_contribution_summary}}',
              },
              promotion_and_support: {
                label: '6. 販促と BITE の支援',
                prefillTemplate:
                  '{{final-agreed-package.promotion_terms}}\n\nBITE の支援：{{proposal-v1.bite_support}}',
              },
              final_negotiated_conditions: {
                label: '7. 最終的な交渉条件',
                prefillTemplate:
                  '返品：{{final-agreed-package.return_terms}}\n支払条件：{{final-agreed-package.payment_terms_days}} 日\nデータ共有：{{final-agreed-package.data_sharing}}\nサンプリング：{{final-agreed-package.sampling}}',
              },
              competitive_differentiation: { label: '8. 競合との差別化' },
              key_risks_and_response: {
                label: '9. 主なリスクと対応',
                prefillTemplate:
                  '主なリスク：{{proposal-v1.key_risk}}\n対策：{{proposal-v1.risk_mitigation}}\nQuickMart のリスク低減：{{proposal-v2-revision.how_to_reduce_quickmart_risk}}',
              },
              next_action: { label: '10. 次のアクション' },
            },
          },
        },
      },
    },
  },
};
