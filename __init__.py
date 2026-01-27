import os
import folder_paths
from server import PromptServer
from aiohttp import web

routes = PromptServer.instance.routes

@routes.get("/model_preview/get_image_by_name")
async def get_image_by_name(request):
    try:
        # 1. 获取参数
        folder_type = request.rel_url.query.get("folder_type", "checkpoints")
        filename = request.rel_url.query.get("filename", "")
        
        if not filename:
            return web.Response(status=400)

        # 2. 映射前端类型到后端 folder_paths 类型
        # 处理一些特殊情况，比如 unet 可能在 diffusion_models 里
        valid_types = ["checkpoints", "loras", "unet", "vae", "controlnet", "diffusion_models"]
        if folder_type not in valid_types:
            folder_type = "checkpoints" # 默认回退

        # 3. 获取文件路径
        # get_full_path 能够处理多层子目录的情况 (e.g. "SDXL\my_model.safetensors")
        file_path = folder_paths.get_full_path(folder_type, filename)
        
        if not file_path:
            # 尝试在 diffusion_models 里找 (针对 UNET)
            if folder_type == "unet":
                 file_path = folder_paths.get_full_path("diffusion_models", filename)
            
            if not file_path:
                return web.Response(status=404, text="Model file not found")

        # 4. 寻找同名图片
        base_path = os.path.splitext(file_path)[0]
        image_path = None
        
        # 优先级：png > jpg > jpeg > webp
        for ext in [".png", ".jpg", ".jpeg", ".webp", ".PNG", ".JPG"]:
            test_path = base_path + ext
            if os.path.exists(test_path):
                image_path = test_path
                break
        
        if image_path:
            return web.FileResponse(image_path)
        else:
            return web.Response(status=404, text="Preview image not found")

    except Exception as e:
        print(f"[Preview Error] {e}")
        return web.Response(status=500)

NODE_CLASS_MAPPINGS = {}
WEB_DIRECTORY = "./js"