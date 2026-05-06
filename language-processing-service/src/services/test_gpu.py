import torch
print("CUDA Available:", torch.cuda.is_available())
print("Torch version:", torch.__version__)

try:
    # Nhồi một cục tensor lớn lên GPU để ép nó làm việc
    x = torch.randn(10000, 10000, device='cuda')
    y = torch.randn(10000, 10000, device='cuda')
    z = torch.matmul(x, y)
    print("GPU tính toán thành công, VRAM không bị sập!")
except Exception as e:
    print(f"Lỗi: {e}")