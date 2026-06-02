import type { AlignEdge } from "./Inspector.tsx";

type Props = {
  count: number;
  onAlignSelection: (edge: AlignEdge) => void;
  onDistributeSelection: (axis: "h" | "v") => void;
  onDeleteSelection: () => void;
};

/** Shown when 2+ nodes are selected: bulk align, distribute, delete. */
export function MultiInspector({ count, onAlignSelection, onDistributeSelection, onDeleteSelection }: Props) {
  return (
    <div className="inspector">
      <div className="inspector-head">
        <span className="badge">{count} 個選択中</span>
      </div>

      <h4>整列（端を1本に揃える）</h4>
      <div className="align-grid">
        <button title="左揃え" onClick={() => onAlignSelection("left")}>⬅</button>
        <button title="左右中央" onClick={() => onAlignSelection("hcenter")}>↔</button>
        <button title="右揃え" onClick={() => onAlignSelection("right")}>➡</button>
        <button title="上揃え" onClick={() => onAlignSelection("top")}>⬆</button>
        <button title="上下中央" onClick={() => onAlignSelection("vcenter")}>↕</button>
        <button title="下揃え" onClick={() => onAlignSelection("bottom")}>⬇</button>
      </div>
      <p className="hint">※「揃える」は座標を1本の線に合わせる動作です。縦に並んだものを縦揃えすると重なります（仕様）。重ねずに並べたいときは下の「等間隔」を使ってください。</p>

      <h4>等間隔に並べる（重ならない）</h4>
      <div className="dist-row">
        <button disabled={count < 3} onClick={() => onDistributeSelection("h")}>横に等間隔 ▭▭▭</button>
        <button disabled={count < 3} onClick={() => onDistributeSelection("v")}>縦に等間隔 ≡</button>
      </div>
      {count < 3 && <p className="hint">等間隔は3個以上の選択で使えます。</p>}

      <p className="hint">ドラッグでまとめて移動、矢印キーで微調整、Delete で一括削除。Ctrl+クリックで選択に追加。</p>

      <button className="danger" onClick={onDeleteSelection}>
        {count} 個をまとめて削除
      </button>
    </div>
  );
}
