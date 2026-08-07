export const imageFileToDataUrl = (file: File, options: { maxSide: number; quality?: number; maxLength?: number }) =>
  new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith("image/")) { reject(new Error("Выберите изображение")); return; }
    if (file.size > 12 * 1024 * 1024) { reject(new Error("Файл не должен превышать 12 МБ")); return; }
    const image = new Image();
    const source = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, options.maxSide / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) { URL.revokeObjectURL(source); reject(new Error("Не удалось обработать изображение")); return; }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", options.quality ?? 0.78);
      URL.revokeObjectURL(source);
      if (dataUrl.length > (options.maxLength ?? 250_000)) { reject(new Error("Изображение получилось слишком большим")); return; }
      resolve(dataUrl);
    };
    image.onerror = () => { URL.revokeObjectURL(source); reject(new Error("Не удалось открыть изображение")); };
    image.src = source;
  });
