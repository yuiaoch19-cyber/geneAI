# GeneAI 手动验收样本

用于课程演示或功能自测。三条序列均为真实 HBB 片段/其人工变异，可直接粘贴，也可作为 FASTA 上传。

| 文件 | 用途 | 长度 | 说明 |
| --- | --- | --- | --- |
| `HBB-analysis.fasta` | 单序列分析 | 92 bp | 人类 HBB CDS 起始片段；FASTA 名称解析为 `HBB_demo` |
| `compare-reference.fasta` | 差异比较（参考） | 92 bp | 与上一条序列相同 |
| `compare-query.fasta` | 差异比较（查询） | 93 bp | 第 21 位 G→A，第 50 位后插入 T |

## 分析页预期结果（92 bp）

- 长度：92 bp
- 计数：A=17，T=21，G=36，C=18，N=0
- GC：58.7%（(36+18)/92）
- AT：41.3%（(17+21)/92）
- 互补链（3′→5′）：
  `TACCACGTAGACTGAGGACTCCTCTTCAGACGGCAATGACGGGACACCCCGTTCCACTTGCACCTACTTCAACCACCACTCCGGGACCCGTC`
- 反向互补（5′→3′）：
  `CTGCCCAGGGCCTCACCACCAACTTCATCCACGTTCACCTTGCCCCACAGGGCAGTAACGGCAGACTTCTCCTCAGGAGTCAGATGCACCAT`
- RNA（5′→3′）：
  `AUGGUGCAUCUGACUCCUGAGGAGAAGUCUGCCGUUACUGCCCUGUGGGGCAAGGUGAACGUGGAUGAAGUUGGUGGUGAGGCCCUGGGCAG`

## 比对页预期结果

| 指标 | 预期 |
| --- | --- |
| 比对评分 | 171 |
| 一致性 | 97.85% / 97.8% |
| 替换 | 1（参考第 21 位 G → 查询 A） |
| 插入 | 1（参考第 50 位后插入 T） |
| 缺失 | 0 |
| 总差异 | 2 |
| 算法 | Biopython PairwiseAligner，global，match +2 / mismatch −1 / gap open −10 / extend −0.5 |

## 最短自测（可不建文件）

序列 `ATGCATGCATGC`：A/T/G/C 各 3，GC 50.0%，AT 50.0%，互补 `TACGTACGTACG`，反向互补 `GCATGCATGCAT`，RNA `AUGCAUGCAUGC`。

## 手动流程

1. 打开 `/analysis`，点「上传 FASTA」选择 `HBB-analysis.fasta`，点「分析序列」，核对上表；再点「保存到历史」。
2. 打开 `/history`，搜索 `HBB_demo`，点「查看」核对详情，点下载导出 PDF。
3. 打开 `/compare`，两侧分别上传 `compare-reference.fasta` 与 `compare-query.fasta`，点「开始比对」，核对 1 替换 + 1 插入与坐标。
4. 打开 `/visualization`，选择刚保存的记录，窗口 50 / 步长 10，点「应用参数」。
5. 回到 Dashboard 查看统计、环形图、趋势与最近记录。
