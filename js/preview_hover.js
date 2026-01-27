import { app } from "../../scripts/app.js";

// 配置项：弹窗最大宽度
const PREVIEW_MAX_WIDTH = 350; 

app.registerExtension({
    name: "ComfyUI.ModelPreviewHover",
    setup() {
        // 1. 创建全局唯一的预览弹窗元素
        const previewImg = document.createElement("img");
        previewImg.id = "model-preview-hover-popup";
        previewImg.style.position = "fixed";
        previewImg.style.display = "none";
        previewImg.style.zIndex = "9999";
        previewImg.style.border = "2px solid #aaa";
        previewImg.style.borderRadius = "8px";
        previewImg.style.background = "#000";
        previewImg.style.maxWidth = `${PREVIEW_MAX_WIDTH}px`;
        previewImg.style.maxHeight = "500px";
        previewImg.style.objectFit = "contain";
        previewImg.style.pointerEvents = "none"; // 鼠标穿透
        previewImg.style.boxShadow = "5px 5px 15px rgba(0,0,0,0.5)";
        document.body.appendChild(previewImg);

        // --- 新增：全局安全网 ---
        // 无论鼠标在屏幕哪里按下，第一时间强制隐藏预览图
        // 这解决了点击菜单外关闭菜单时，图片残留的问题
        document.addEventListener("mousedown", () => {
            previewImg.style.display = "none";
            previewImg.src = "";
        }, true); // useCapture=true 确保最先触发

        // 2. 劫持 LiteGraph.ContextMenu
        const OriginalContextMenu = LiteGraph.ContextMenu;

        LiteGraph.ContextMenu = function (values, options) {
            const menuInstance = new OriginalContextMenu(values, options);

            if (!menuInstance.root) return menuInstance;

            // 获取当前节点上下文
            const node = app.graph.getNodeOnPos(app.canvas.graph_mouse[0], app.canvas.graph_mouse[1]);
            if (!node) return menuInstance;

            // 判断类型
            let folderType = null;
            const nodeTypeLower = node.type.toLowerCase();

            if (nodeTypeLower.includes("checkpoint")) folderType = "checkpoints";
            else if (nodeTypeLower.includes("lora")) folderType = "loras";
            else if (nodeTypeLower.includes("unet")) folderType = "unet";
            else if (nodeTypeLower.includes("vae") && !nodeTypeLower.includes("decode")) folderType = "vae";
            else if (nodeTypeLower.includes("controlnet")) folderType = "controlnet";
            else if (nodeTypeLower.includes("diffusion_models")) folderType = "diffusion_models"; 

            if (!folderType) return menuInstance;

            // 遍历菜单项绑定事件
            const entries = menuInstance.root.querySelectorAll(".litemenu-entry");
            
            entries.forEach(entry => {
                const modelName = entry.innerText || entry.textContent;
                if (!modelName || !modelName.includes(".")) return;

                // 悬停显示
                entry.addEventListener("mouseenter", (e) => {
                    const src = `/model_preview/get_image_by_name?folder_type=${folderType}&filename=${encodeURIComponent(modelName)}`;
                    previewImg.src = src;
                    previewImg.style.display = "block";
                    
                    previewImg.onload = () => {
                        const rect = entry.getBoundingClientRect();
                        let left = rect.right + 10;
                        let top = rect.top;

                        if (left + previewImg.offsetWidth > window.innerWidth) {
                            left = rect.left - previewImg.offsetWidth - 10;
                        }
                        if (top + previewImg.offsetHeight > window.innerHeight) {
                            top = window.innerHeight - previewImg.offsetHeight - 10;
                        }
                        previewImg.style.left = `${left}px`;
                        previewImg.style.top = `${top}px`;
                    };
                    
                    previewImg.onerror = () => {
                        previewImg.style.display = "none";
                    };
                });

                // 移出隐藏
                entry.addEventListener("mouseleave", () => {
                    previewImg.style.display = "none";
                });

                // --- 核心修复：点击立即隐藏 ---
                // 当用户点击选中时，强制关闭图片，防止菜单销毁后图片残留
                entry.addEventListener("click", () => {
                    previewImg.style.display = "none";
                    previewImg.src = "";
                });
            });

            return menuInstance;
        };

        LiteGraph.ContextMenu.prototype = OriginalContextMenu.prototype;
    }
});