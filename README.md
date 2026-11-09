# 廟口石獅 雨夜

賽博龐克雨夜風格的廟口石獅捲動介紹頁（three.js r160）。

## 檔案
- `index.html`：頁面內容（只有 HTML）
- `models/lion.glb`：主角石獅
- `models/temple.glb`：背景廟宇

### 樣式 `css/`（依此順序載入）
| 檔案 | 內容 |
|---|---|
| `base.css` | 顏色與字型 token、全域重置 |
| `stage.css` | WebGL 畫布、底噪、開場掃描 |
| `hud.css` | 品牌、章節軌、鎖定框、聲音鈕 |
| `panels.css` | 捲動章節與說明卡片 |
| `responsive.css` | 窄螢幕與減少動態（必須最後載入） |

### 程式 `js/`
| 位置 | 內容 |
|---|---|
| `main.js` | 入口：載入場景、下載模型、啟動主迴圈 |
| `config.js` | 常調的數值 |
| `loop.js` | 每一幀的更新、畫面尺寸調整 |
| `loader.js` | 下載 .glb、開場進度條 |
| `core/stage.js` | renderer、scene、camera、裝置判斷 |
| `shaders/` | GLSL：決定 3D 物件外觀 |
| `scene/` | 3D 物件：石獅、廟、背景、燈籠、地面、光錐與香塵、雨、招牌、後製 |
| `ui/` | 捲動換算、滑鼠／觸控、DOM 介面 |
| `audio/sound.js` | 即時合成的聲音 |

## 怎麼開
瀏覽器不允許用 `file://` 直接讀模型，所以要用本機伺服器開：

- VS Code：裝 Live Server，對 `index.html` 按右鍵 → Open with Live Server
- 或在這個資料夾開終端機：`npx serve .`，再打開它顯示的網址

three.js 與字型從 CDN（jsDelivr、Google Fonts）載入，需要連網。

## 常調的地方（搜尋這些字）
- `KEYS`（`js/config.js`）：每一章石獅轉的角度、鏡頭對準的部位、距離
- `TEMPLE_POS` / `TEMPLE_SCALE`（`js/config.js`）：背景廟的位置與大小
- `FOG_TARGET`（`js/config.js`）：霧的濃度
- `templeMaterials()`（`js/scene/temple.js`）：廟各部位的顏色
- `uDim`（`js/loop.js`）、`'燈籠'`（`js/scene/temple.js`）：燈籠亮度
- `DISSOLVE`（`js/shaders/common.js`）、`powderMat`（`js/scene/lion.js`）：滑過石獅的溶解與粒子效果
