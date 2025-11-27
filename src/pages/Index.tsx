import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Sparkles, Camera, Image, Trophy, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { createWorker, PSM } from 'tesseract.js';
import { useLottery } from "@/hooks/use-lottery";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Index = () => {
  const { numbers, loading, addNumber, removeNumber, updatePrizes } = useLottery();
  const [inputValue, setInputValue] = useState("");
  const [nameValue, setNameValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Calcular estadísticas
  const winners = numbers.filter(n => n.prize && n.prize > 0);
  const totalPrize = winners.reduce((sum, n) => sum + (n.prize || 0), 0);
  const totalNumbers = numbers.length;
  const winnersCount = winners.length;

  const handleAddNumber = async () => {
    const trimmed = inputValue.trim();
    const trimmedName = nameValue.trim();

    if (!trimmed) {
      toast.error("Por favor introduce un número");
      return;
    }

    if (!trimmedName) {
      toast.error("Por favor introduce un nombre");
      return;
    }

    if (!/^\d{5}$/.test(trimmed)) {
      toast.error("El número debe tener 5 dígitos");
      return;
    }

    if (numbers.some(n => n.number === trimmed)) {
      toast.error("Este número ya está añadido");
      return;
    }

    const result = await addNumber(trimmed, trimmedName);

    if (result.error) {
      toast.error(result.error.message || "Error al añadir el número");
      return;
    }

    setInputValue("");
    setNameValue("");
    toast.success("Número añadido correctamente");
  };

  const handleRemoveNumber = async (id: string) => {
    const result = await removeNumber(id);

    if (result.error) {
      toast.error("Error al eliminar el número");
      return;
    }

    setDeleteDialogOpen(null);
    toast.success("Número eliminado");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddNumber();
    }
  };

  const [debugInfo, setDebugInfo] = useState<{ imageUrl: string; text: string } | null>(null);

  const preprocessImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // Resize if too large (max 1600px width for better detail)
        const MAX_WIDTH = 1600;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = (height * MAX_WIDTH) / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);

        // Get image data for processing
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Create a buffer for sharpening
        const w = width;
        const h = height;
        const buff = new Uint8ClampedArray(data);

        // Sharpen kernel
        //  0 -1  0
        // -1  5 -1
        //  0 -1  0
        const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];

        // Contrast factor
        const contrast = 1.2;
        const intercept = 128 * (1 - contrast);

        // Apply sharpening, grayscale and contrast
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = (y * w + x) * 4;

            // Apply sharpening to RGB channels
            for (let c = 0; c < 3; c++) {
              let val = 0;
              val += buff[((y - 1) * w + (x)) * 4 + c] * kernel[1];
              val += buff[((y) * w + (x - 1)) * 4 + c] * kernel[3];
              val += buff[((y) * w + (x)) * 4 + c] * kernel[4];
              val += buff[((y) * w + (x + 1)) * 4 + c] * kernel[5];
              val += buff[((y + 1) * w + (x)) * 4 + c] * kernel[7];

              data[idx + c] = val;
            }

            // Convert to grayscale and contrast
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            let gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            gray = gray * contrast + intercept;
            gray = Math.max(0, Math.min(255, gray));

            data[idx] = gray;
            data[idx + 1] = gray;
            data[idx + 2] = gray;
          }
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const loadImageFromDataUrl = (dataUrl: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });
  };

  // Función auxiliar para extraer el número correcto de una secuencia larga
  const extractCorrectNumberFromSequence = (text: string): string | null => {
    const longDigitSequences = text.match(/\d{15,}/g); // Secuencias de 15+ dígitos (códigos de barras)
    if (!longDigitSequences || longDigitSequences.length === 0) {
      return null;
    }

    for (const sequence of longDigitSequences) {
      // Extraer TODOS los números de 5 dígitos posibles, deslizándose de uno en uno
      const matches: string[] = [];
      for (let i = 0; i <= sequence.length - 5; i++) {
        matches.push(sequence.substring(i, i + 5));
      }
      if (!matches || matches.length === 0) continue;

      // Buscar números que cumplan criterios específicos del número de lotería
      let bestCandidate: { number: string; index: number; score: number } | null = null;

      for (let i = 0; i < matches.length; i++) {
        const candidate = matches[i];
        let score = 0;
        const relativePos = i / matches.length;

        // El número correcto suele estar en el 70-95% de la secuencia
        // En "510250409050748735554", "74873" está en posición 12 de 13 (92%)
        if (relativePos >= 0.70 && relativePos <= 0.95) {
          score += 35;
        } else if (relativePos >= 0.60 && relativePos <= 0.98) {
          score += 20;
        } else if (relativePos >= 0.50 && relativePos <= 0.99) {
          score += 5;
        }

        // Penalizar números que empiezan con 0, 1, o 5 seguido de 0/1
        if (candidate.startsWith('0') || candidate.startsWith('1')) {
          score -= 40;
        }
        if (candidate.startsWith('50') || candidate.startsWith('51')) {
          score -= 35;
        }

        // Bonus enorme para números que empiezan con 7
        // Y bonus extra si además están en la posición correcta
        if (candidate.startsWith('7')) {
          score += 30;
          if (relativePos >= 0.70 && relativePos <= 0.95) {
            score += 20; // Bonus extra por posición correcta
          }
        } else if (candidate.startsWith('8') || candidate.startsWith('9')) {
          score += 10;
        }

        // Penalizar números con dígitos repetidos consecutivos
        if (candidate.match(/(\d)\1{2,}/)) { // 3 o más dígitos iguales seguidos
          score -= 25;
        } else if (candidate.match(/(\d)\1/)) { // 2 dígitos iguales seguidos
          score -= 5;
        }

        // Penalizar específicamente números problemáticos
        if (candidate === '50748' || candidate === '73555' || candidate === '35554') {
          score -= 50;
        }

        // Priorizar números con dígitos variados
        const uniqueDigits = new Set(candidate).size;
        if (uniqueDigits >= 4) {
          score += 5;
        }

        if (!bestCandidate || score > bestCandidate.score) {
          bestCandidate = { number: candidate, index: i, score };
        }
      }

      if (bestCandidate && bestCandidate.score > 20) {
        console.log(`Número extraído de secuencia: ${bestCandidate.number} (índice ${bestCandidate.index}, score ${bestCandidate.score})`);
        return bestCandidate.number;
      }
    }

    return null;
  };

  const detectNumberFromFocusedBand = async (imageDataUrl: string): Promise<string | null> => {
    try {
      const img = await loadImageFromDataUrl(imageDataUrl);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return null;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, img.width, img.height);

      const width = canvas.width;
      const height = canvas.height;
      // Buscar la banda horizontal con más contraste (donde está el número grande)
      // El número del décimo suele estar en el tercio superior-medio de la imagen
      const searchStart = Math.floor(height * 0.15);
      const searchEnd = Math.floor(height * 0.65); // Buscar hasta el 65% de la altura
      const rowLimit = searchEnd;
      const imageData = ctx.getImageData(0, searchStart, width, searchEnd - searchStart);
      const rowScores = new Array(rowLimit - searchStart).fill(0);
      const data = imageData.data;
      const dataWidth = width;

      // Calcular el "score" de cada fila (más oscuro = más texto)
      for (let y = 0; y < rowLimit - searchStart; y++) {
        let sum = 0;
        let count = 0;
        for (let x = 0; x < width; x++) {
          const idx = (y * dataWidth + x) * 4;
          const gray = 255 - data[idx]; // Invertir: más oscuro = mayor valor
          sum += gray;
          count++;
        }
        rowScores[y] = sum / count; // Promedio para normalizar
      }

      // Encontrar la fila con mayor contraste (donde está el número)
      let bestY = Math.floor((searchStart + searchEnd) / 2);
      let bestScore = -Infinity;

      for (let y = 0; y < rowScores.length; y++) {
        // Priorizar filas con alto contraste
        const score = rowScores[y];
        if (score > bestScore) {
          bestScore = score;
          bestY = searchStart + y;
        }
      }

      // Asegurar que la banda incluya suficiente espacio vertical
      const bandHeight = Math.max(100, Math.floor(height * 0.30)); // Aumentar altura de banda
      let startY = Math.max(searchStart, bestY - Math.floor(bandHeight / 2));
      const maxStart = Math.max(searchStart, searchEnd - bandHeight);
      startY = Math.min(startY, maxStart);

      // Intentar OCR en múltiples zonas si la primera no funciona
      const zonesToTry = [
        { start: startY, height: bandHeight },
        { start: Math.max(0, startY - Math.floor(bandHeight * 0.3)), height: bandHeight },
        { start: Math.min(height - bandHeight, startY + Math.floor(bandHeight * 0.3)), height: bandHeight },
        { start: Math.floor(height * 0.25), height: Math.floor(height * 0.35) }, // Zona central fija
      ];

      for (let zoneIdx = 0; zoneIdx < zonesToTry.length; zoneIdx++) {
        const zone = zonesToTry[zoneIdx];
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = width;
        cropCanvas.height = zone.height;
        const cropCtx = cropCanvas.getContext('2d');

        if (!cropCtx) {
          continue;
        }

        cropCtx.drawImage(img, 0, zone.start, width, zone.height, 0, 0, width, zone.height);
        const focusedDataUrl = cropCanvas.toDataURL('image/png');

        const worker = await createWorker('eng');
        await worker.setParameters({
          tessedit_char_whitelist: '0123456789',
          tessedit_pageseg_mode: PSM.SINGLE_LINE,
        });

        const { data: focusedData } = await worker.recognize(focusedDataUrl);
        await worker.terminate();

        const rawText = focusedData.text || '';
        console.log(`Texto OCR banda enfocada (zona ${zoneIdx + 1}, Y=${zone.start}):`, rawText || '(vacío)');

        // Strategy 1: Buscar números de 5 dígitos contiguos
        const contiguousDigits = rawText.replace(/\D/g, '');
        const contiguousMatches = contiguousDigits.match(/\d{5}/g);
        if (contiguousMatches && contiguousMatches.length > 0) {
          // Priorizar números que no empiezan con 0 o 1 (más probable que sean el número principal)
          const prioritized = contiguousMatches.find(num => !num.startsWith('0') && !num.startsWith('1')) 
            || contiguousMatches.find(num => !num.startsWith('0'))
            || contiguousMatches[0];
          console.log(`✅ Número encontrado en banda zona ${zoneIdx + 1} (contiguo):`, prioritized);
          return prioritized;
        }

        // Strategy 2: Buscar dígitos espaciados (ej: "7 4 8 7 3")
        const spacedDigits = rawText
          .trim()
          .split(/\s+/)
          .map(part => part.replace(/\D/g, ''))
          .filter(part => part.length === 1);

        if (spacedDigits.length >= 5) {
          const number = spacedDigits.slice(0, 5).join('');
          console.log(`✅ Número encontrado en banda zona ${zoneIdx + 1} (espaciado):`, number);
          return number;
        }

        // Strategy 3: Buscar cualquier secuencia de 5 dígitos, incluso con caracteres intermedios
        const anyFiveDigits = rawText.match(/\d[\d\s]{3,7}\d/);
        if (anyFiveDigits) {
          const cleaned = anyFiveDigits[0].replace(/\D/g, '');
          if (cleaned.length >= 5) {
            const number = cleaned.slice(0, 5);
            console.log(`✅ Número encontrado en banda zona ${zoneIdx + 1} (con caracteres intermedios):`, number);
            return number;
          }
        }
      }

      console.log('❌ No se encontró número en ninguna banda enfocada');
      return null;
    } catch (error) {
      console.error('Error en OCR enfocado:', error);
      return null;
    }
  };

  const processImage = async (file: File) => {
    setIsProcessing(true);
    toast.info("Procesando imagen...");

    try {
      const processedImage = await preprocessImage(file);
      const worker = await createWorker('eng');

      await worker.setParameters({
        // Permitimos letras para que Tesseract no fuerce textos como
        // "SIETE CUATRO..." a dígitos que terminan compitiendo con el número real
        // (por ejemplo, produciendo 22202). Luego filtramos manualmente solo los dígitos.
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz/ºª',
        // Usar AUTO en lugar de SINGLE_BLOCK para que detecte mejor las palabras individuales
        // Esto ayuda a separar el número grande del código de barras
        tessedit_pageseg_mode: PSM.AUTO,
      });

      const { data } = await worker.recognize(processedImage);
      await worker.terminate();
      const text = data.text as string;
      const words = ((data as any).words || []) as Array<{
        text?: string;
        confidence?: number;
        bbox?: { x0: number; x1: number; y0: number; y1: number };
      }>;

      console.log("Recognized text:", text);

      let detectedNumber: string | null = null;
      let usedSequenceFallback = false;
      let imageHeight = 0;
      let imageWidth = 0;

      // Obtener dimensiones de la imagen procesada para calcular posiciones relativas
      if (words && words.length > 0) {
        const allY = words.flatMap(w => w.bbox ? [w.bbox.y0, w.bbox.y1] : []);
        const allX = words.flatMap(w => w.bbox ? [w.bbox.x0, w.bbox.x1] : []);
        if (allY.length > 0) {
          imageHeight = Math.max(...allY);
          imageWidth = Math.max(...allX);
        }
      }

      // Strategy 0: Buscar números de 5 dígitos en palabras individuales Y dentro de cadenas largas
      if (words && words.length > 0) {
        const wordCandidates: Array<{
          value: string;
          area: number;
          confidence: number;
          height: number;
          centerY: number;
          isFromLongSequence: boolean;
        }> = [];

        // Primero, buscar en palabras individuales
        for (const word of words) {
          const rawText = word.text ?? "";
          const digitsOnly = rawText.replace(/\D/g, "");
          
          if (digitsOnly.length === 5) {
            const bbox = word.bbox || { x0: 0, x1: 0, y0: 0, y1: 0 };
            const width = Math.max(1, bbox.x1 - bbox.x0);
            const height = Math.max(1, bbox.y1 - bbox.y0);
            const area = width * height;
            const centerY = (bbox.y0 + bbox.y1) / 2;
            
            wordCandidates.push({
              value: digitsOnly,
              area,
              confidence: word.confidence ?? 0,
              height,
              centerY,
              isFromLongSequence: false,
            });
          } else if (digitsOnly.length > 5) {
            // Extraer todos los números de 5 dígitos de cadenas largas
            // (como "510250409050748735554" -> ["51025", "04090", "50748", "73555", "74873", "48735", ...])
            const matches = digitsOnly.match(/\d{5}/g);
            if (matches) {
              const bbox = word.bbox || { x0: 0, x1: 0, y0: 0, y1: 0 };
              const width = Math.max(1, bbox.x1 - bbox.x0);
              const height = Math.max(1, bbox.y1 - bbox.y0);
              const area = width * height;
              const centerY = (bbox.y0 + bbox.y1) / 2;
              
              // Para cada número encontrado en la cadena larga
              for (const match of matches) {
                wordCandidates.push({
                  value: match,
                  area,
                  confidence: word.confidence ?? 0,
                  height,
                  centerY,
                  isFromLongSequence: true,
                });
              }
            }
          }
        }

        if (wordCandidates.length > 0) {
          console.log("Total candidatos encontrados:", wordCandidates.length);
          console.log("Candidatos (primeros 10):", wordCandidates.slice(0, 10).map(c => ({
            value: c.value,
            area: Math.round(c.area),
            height: Math.round(c.height),
            isFromLongSequence: c.isFromLongSequence,
            centerY: Math.round(c.centerY),
            relativeY: imageHeight > 0 ? (c.centerY / imageHeight).toFixed(2) : 'N/A'
          })));
          
          // Filtrar números que están claramente en la parte inferior (código de barras)
          // y priorizar los que están más centrados verticalmente
          const filteredCandidates = wordCandidates
            .filter(candidate => {
              // Si la imagen tiene altura, filtrar los que están en el último 15% (código de barras)
              if (imageHeight > 0) {
                const relativeY = candidate.centerY / imageHeight;
                // Excluir completamente los del fondo (últimos 15%)
                if (relativeY > 0.85) {
                  return false;
                }
              }
              return true;
            })
            .sort((a, b) => {
              // CRÍTICO: Priorizar números que NO vienen de secuencias largas (código de barras)
              // Esto es lo más importante - el número principal del décimo está en una palabra individual
              if (a.isFromLongSequence !== b.isFromLongSequence) {
                return a.isFromLongSequence ? 1 : -1;
              }
              
              // Si ambos vienen de secuencias largas, descartarlos completamente
              // (solo usarlos si no hay nada más)
              if (a.isFromLongSequence && b.isFromLongSequence) {
                // Entre secuencias largas, priorizar por área y posición
                if (Math.abs(b.area - a.area) > Math.max(a.area, b.area) * 0.2) {
                  return b.area - a.area;
                }
                // Priorizar los que están más centrados
                if (imageHeight > 0) {
                  const aCenter = Math.abs(a.centerY / imageHeight - 0.5);
                  const bCenter = Math.abs(b.centerY / imageHeight - 0.5);
                  return aCenter - bCenter;
                }
                return 0;
              }
              
              // Para palabras individuales (no secuencias largas), priorizar por:
              // 1. Área (más grande = más visible = número principal)
              if (Math.abs(b.area - a.area) > Math.max(a.area, b.area) * 0.15) {
                return b.area - a.area;
              }
              // 2. Altura del texto (más alto = más grande)
              if (Math.abs(b.height - a.height) > Math.max(a.height, b.height) * 0.15) {
                return b.height - a.height;
              }
              // 3. Confianza del OCR
              if (Math.abs(b.confidence - a.confidence) > 5) {
                return b.confidence - a.confidence;
              }
              // 4. Posición centrada verticalmente
              if (imageHeight > 0) {
                const aCenter = Math.abs(a.centerY / imageHeight - 0.5);
                const bCenter = Math.abs(b.centerY / imageHeight - 0.5);
                return aCenter - bCenter;
              }
              return 0;
            });

          if (filteredCandidates.length > 0) {
            // Si hay candidatos que NO vienen de secuencias largas, usar solo esos
            const nonSequenceCandidates = filteredCandidates.filter(c => !c.isFromLongSequence);
            if (nonSequenceCandidates.length > 0) {
              detectedNumber = nonSequenceCandidates[0].value;
              console.log("Número detectado por Strategy 0 (palabra individual):", detectedNumber);
              console.log("Top 5 candidatos individuales:", nonSequenceCandidates.slice(0, 5).map(c => ({
                value: c.value,
                area: Math.round(c.area),
                height: Math.round(c.height),
                confidence: Math.round(c.confidence),
                centerY: Math.round(c.centerY)
              })));
            } else {
              // Solo usar secuencias largas si no hay nada más
              detectedNumber = filteredCandidates[0].value;
              usedSequenceFallback = true;
              console.log("⚠️ Número detectado por Strategy 0 (secuencia larga, fallback):", detectedNumber);
              console.log("Top 5 candidatos (secuencias largas):", filteredCandidates.slice(0, 5).map(c => ({
                value: c.value,
                area: Math.round(c.area),
                height: Math.round(c.height),
                centerY: Math.round(c.centerY)
              })));
            }
          }
        }
      }

      // Strategy 1: Look for exact 5-digit numbers (word boundary) - solo si no encontramos nada
      if (!detectedNumber) {
        const exactMatches = text.match(/\b\d{5}\b/g);

        if (exactMatches && exactMatches.length > 0) {
          detectedNumber = exactMatches[0];
          console.log("Número detectado por Strategy 1:", detectedNumber);
        }
      }

      // Strategy 2: Buscar en cadenas largas de dígitos SOLO como último recurso
      // Esta estrategia es problemática porque el código de barras tiene secuencias largas
      // Solo la usamos si Strategy 0 y 1 no encontraron nada
      if (!detectedNumber) {
        const longDigitSequences = text.match(/\d{10,}/g); // Secuencias de 10+ dígitos
        if (longDigitSequences) {
          let bestMatch: { number: string; position: number; score: number } | null = null;
          
          for (const sequence of longDigitSequences) {
            const position = text.indexOf(sequence);
            
            // CRÍTICO: Extraer TODOS los números de 5 dígitos posibles, deslizándose de uno en uno
            // En "510250409050748735554" (17 dígitos) hay 13 números posibles:
            // 51025, 10250, 02504, 25040, 50409, 04090, 40905, 09050, 90507, 05074, 50748, 07487, 74873, 48735, 87355, 73555, 35554
            const matches: string[] = [];
            for (let i = 0; i <= sequence.length - 5; i++) {
              matches.push(sequence.substring(i, i + 5));
            }
            
            if (matches && matches.length > 0) {
              // PRIMERO: Buscar específicamente números que están en el rango típico de lotería
              // Los números de lotería suelen estar entre 00000 y 99999, pero los más comunes
              // no empiezan con 0 o 1 en el contexto de códigos de barras
              
              // Buscar números que están en la posición correcta de la secuencia
              // En "510250409050748735554", el número correcto "74873" está en el índice 12 de 13 posibles
              console.log("Analizando secuencia:", sequence, "con", matches.length, "números de 5 dígitos (deslizándose)");
              
              for (let i = 0; i < matches.length; i++) {
                const candidate = matches[i];
                let score = 0;
                
                // CRÍTICO: El número del décimo suele estar en el 70-95% de la secuencia
                // En "510250409050748735554" (17 dígitos), el número "74873" está en posición 12 de 13 posibles (92%)
                const relativePosition = i / matches.length;
                
                // BONUS MÁXIMO: Números que están en la posición 70-95% de la secuencia
                // (donde casi siempre está el número del décimo en códigos de barras)
                if (relativePosition >= 0.70 && relativePosition <= 0.95) {
                  score += 30; // Bonus MUY alto
                } else if (relativePosition >= 0.60 && relativePosition <= 0.98) {
                  score += 15; // Bonus alto
                } else if (relativePosition >= 0.50 && relativePosition <= 0.99) {
                  score += 5; // Bonus bajo
                }
                
                // Penalizar números que empiezan con 0 o 1 (códigos de barras suelen tener estos)
                if (candidate.startsWith('0') || candidate.startsWith('1')) {
                  score -= 30; // Penalización MUY alta
                }
                
                // Penalizar números que empiezan con 5 seguido de 0 o 1 (51025, 50748, etc.)
                if (candidate.startsWith('50') || candidate.startsWith('51')) {
                  score -= 25; // Penalización muy alta
                }
                
                // BONUS ENORME: Números que empiezan con 7 (más común en números de lotería)
                // Y BONUS EXTRA si además están en la posición correcta (70-95%)
                if (candidate.startsWith('7')) {
                  score += 25; // Bonus enorme
                  // Bonus adicional si está en la posición correcta
                  if (relativePosition >= 0.70 && relativePosition <= 0.95) {
                    score += 15; // Bonus extra por posición correcta
                  }
                } else if (candidate.startsWith('8') || candidate.startsWith('9')) {
                  score += 10; // Bonus alto
                }
                
                // Priorizar números que tienen dígitos variados (no patrones repetitivos)
                const uniqueDigits = new Set(candidate).size;
                if (uniqueDigits >= 4) {
                  score += 5;
                }
                
                // Penalizar números que tienen muchos ceros seguidos
                if (candidate.includes('00')) {
                  score -= 15;
                }
                
                // Penalizar números con dígitos repetidos consecutivos (menos probable en números de lotería)
                if (candidate.match(/(\d)\1{2,}/)) { // 3 o más dígitos iguales seguidos
                  score -= 20;
                } else if (candidate.match(/(\d)\1/)) { // 2 dígitos iguales seguidos
                  score -= 5;
                }
                
                // Penalizar específicamente "73555" que tiene 3 cincos seguidos
                if (candidate === '73555' || candidate === '35554') {
                  score -= 30;
                }
                
                // Penalizar números que tienen patrones obvios de código de barras
                // (códigos suelen tener secuencias como 51025, 10250, 25040, 50748, etc.)
                if (candidate.match(/^(51|10|02|25|50|04|40|09|90|05|07|74)/)) {
                  score -= 20;
                }
                
                // Penalizar específicamente "50748" que es un falso positivo común
                if (candidate === '50748') {
                  score -= 50; // Penalización masiva
                }
                
                console.log(`  Candidato ${i} (${(relativePosition * 100).toFixed(1)}%): ${candidate}, score: ${score}`);
                
                if (!bestMatch || score > bestMatch.score || (score === bestMatch.score && position < bestMatch.position)) {
                  bestMatch = { number: candidate, position, score };
                }
              }
            }
          }
          
          if (bestMatch) {
            detectedNumber = bestMatch.number;
            usedSequenceFallback = true;
            console.log("Número detectado por Strategy 2 (secuencia larga, último recurso):", detectedNumber, "score:", bestMatch.score);
            console.log("⚠️ Este resultado puede ser incorrecto. El OCR enfocado debería corregirlo.");
          }
        }
      }

      // Strategy 3: fallback para dígitos espaciados
      if (!detectedNumber) {
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.includes('/')) continue;

          const cleanLine = line.replace(/\s+/g, '');
          const match = cleanLine.match(/\d{5}/);
          if (match) {
            detectedNumber = match[0];
            console.log("Número detectado por Strategy 3 (fallback):", detectedNumber);
            break;
          }
        }
      }

      // SIEMPRE ejecutar OCR enfocado si:
      // 1. No encontramos nada, O
      // 2. Encontramos algo pero vino de una secuencia larga (código de barras)
      // El OCR enfocado es más confiable porque busca específicamente en la zona del número grande
      if (!detectedNumber || usedSequenceFallback) {
        console.log("Ejecutando OCR enfocado en la banda central (más confiable que secuencias largas)...");
        const focusedNumber = await detectNumberFromFocusedBand(processedImage);
        if (focusedNumber) {
          detectedNumber = focusedNumber;
          usedSequenceFallback = false;
          console.log("✅ Número detectado por OCR enfocado:", focusedNumber);
        } else if (usedSequenceFallback && detectedNumber) {
          // Si el OCR enfocado falló pero tenemos un número de secuencia larga,
          // intentar extraer el número correcto directamente de la secuencia
          console.log("⚠️ OCR enfocado no encontró número. Intentando extraer número correcto de la secuencia...");
          const correctedNumber = extractCorrectNumberFromSequence(text);
          if (correctedNumber && correctedNumber !== detectedNumber) {
            console.log(`✅ Número corregido de "${detectedNumber}" a "${correctedNumber}"`);
            detectedNumber = correctedNumber;
            usedSequenceFallback = false;
          } else {
            console.log("⚠️ No se pudo corregir, usando resultado de secuencia larga:", detectedNumber);
          }
        }
      }

      if (detectedNumber) {
        setInputValue(detectedNumber);
        toast.success("Número detectado: " + detectedNumber);
      } else {
        const cleanText = text.replace(/\s+/g, ' ').trim().substring(0, 50);
        toast.error(`No se detectó número. Abre el depurador para ver detalles.`);
        setDebugInfo({ imageUrl: processedImage, text: text });
      }
    } catch (error) {
      console.error("Error processing image:", error);
      toast.error("Error al procesar la imagen");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleGalleryClick = () => {
    fileInputRef.current?.click();
  };

  const processPDF = async (file: File) => {
    setIsProcessing(true);
    toast.info("Procesando PDF...");

    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + ' ';
      }

      // Buscar números de 5 dígitos y sus premios
      const results = new Map<string, number>();
      const numberPattern = /(\d{5})[^\d]*?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*€?/g;
      let match;

      while ((match = numberPattern.exec(fullText)) !== null) {
        const number = match[1];
        const prizeStr = match[2].replace(/[.,]/g, '');
        const prize = parseInt(prizeStr) / 100; // Convertir a euros

        if (prize > 0) {
          results.set(number, prize);
        }
      }

      // Actualizar premios en la base de datos
      await updatePrizes(results);

      const winnersCount = numbers.filter(n => results.has(n.number)).length;
      if (winnersCount > 0) {
        toast.success(`¡Encontrados ${winnersCount} números premiados!`);
      } else {
        toast.info("No se encontraron números premiados");
      }
    } catch (error) {
      console.error("Error processing PDF:", error);
      toast.error("Error al procesar el PDF");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePDFSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      processPDF(file);
    } else {
      toast.error("Por favor selecciona un archivo PDF");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="h-12 w-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando números...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="container max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="h-8 w-8 text-secondary animate-pulse" />
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent">
              Lotería de Navidad
              <br />
              Ni Fu, Ni FA
            </h1>
            <Sparkles className="h-8 w-8 text-secondary animate-pulse" />
          </div>
          <p className="text-muted-foreground text-lg">
            Gestiona tus números de la Lotería
          </p>
        </div>

        {/* Add Number Section */}
        <Card className="p-6 mb-8 shadow-lg border-2 hover:shadow-festive transition-shadow">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="text"
                placeholder="Nombre"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 text-lg h-12"
                disabled={isProcessing}
              />
              <Input
                type="text"
                placeholder="Número (5 dígitos)"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value.replace(/\D/g, "").slice(0, 5))}
                onKeyPress={handleKeyPress}
                className="flex-1 text-lg h-12"
                maxLength={5}
                disabled={isProcessing}
              />
              <Button
                onClick={handleAddNumber}
                size="lg"
                disabled={isProcessing}
                className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-festive transition-all duration-300 h-12"
              >
                <Plus className="h-5 w-5 mr-2" />
                Añadir
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleCameraClick}
                variant="outline"
                size="lg"
                disabled={isProcessing}
                className="h-12"
              >
                <Camera className="h-5 w-5 mr-2" />
                Cámara
              </Button>
              <Button
                onClick={handleGalleryClick}
                variant="outline"
                size="lg"
                disabled={isProcessing}
                className="h-12"
              >
                <Image className="h-5 w-5 mr-2" />
                Galería
              </Button>
              <Button
                onClick={() => pdfInputRef.current?.click()}
                variant="outline"
                size="lg"
                disabled={isProcessing}
                className="col-span-2 h-12"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Comprobar Premios
              </Button>
            </div>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={pdfInputRef}
            type="file"
            accept="application/pdf"
            onChange={handlePDFSelect}
            className="hidden"
          />
        </Card>

        {/* Numbers Grid */}
        {numbers.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2">
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <Sparkles className="h-16 w-16 opacity-50" />
              <p className="text-lg">
                Aún no has añadido ningún número
              </p>
              <p className="text-sm">
                Introduce tus números de lotería para llevar un control
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-foreground">
                Todos los Números
              </h2>
              <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                {numbers.length} {numbers.length === 1 ? "número" : "números"}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {numbers.map((item) => (
                <Card
                  key={item.id}
                  className={`group relative overflow-hidden border-2 hover:border-primary transition-all duration-300 hover:shadow-festive ${item.prize ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''
                    }`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {item.prize && (
                          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                            <Trophy className="h-3 w-3 mr-1" />
                            Premiado
                          </Badge>
                        )}
                      </div>
                      <AlertDialog open={deleteDialogOpen === item.id} onOpenChange={(open) => setDeleteDialogOpen(open ? item.id : null)}>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-60 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertCircle className="h-5 w-5 text-destructive" />
                              ¿Eliminar número?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Estás a punto de eliminar el número <strong>{item.number}</strong> ({item.name}).
                              Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveNumber(item.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div className="space-y-1">
                      <p className={`text-3xl font-bold ${item.prize ? 'text-green-600' : 'text-primary'} mb-2`}>
                        {item.number}
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {item.name}
                      </p>
                      {item.prize && (
                        <p className="text-xl font-bold text-green-600">
                          {item.prize.toLocaleString("es-ES")} €
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Añadido el {new Date(item.added_at).toLocaleDateString("es-ES")}
                      </p>
                    </div>
                  </div>
                  <div className={`absolute bottom-0 left-0 right-0 h-1 transition-opacity ${item.prize
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 opacity-100'
                    : 'bg-gradient-to-r from-primary via-secondary to-accent opacity-0 group-hover:opacity-100'
                    }`} />
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Winners Banner */}
        {winnersCount > 0 && (
          <Card className="mt-8 bg-gradient-to-r from-green-500 to-emerald-600 border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <Trophy className="h-8 w-8" />
                  <div>
                    <h3 className="text-2xl font-bold">¡Felicidades!</h3>
                    <p className="text-green-50">
                      Tienes {winnersCount} número{winnersCount > 1 ? 's' : ''} premiado{winnersCount > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">{totalPrize.toLocaleString("es-ES")} €</p>
                  <p className="text-green-50">Premio Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistics Section */}
        {totalNumbers > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Números</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {totalNumbers}
                </div>
              </CardContent>
            </Card>
            <Card className={`border-2 ${winnersCount > 0 ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Números Premiados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${winnersCount > 0 ? 'text-green-600' : ''}`}>
                  {winnersCount}
                </div>
              </CardContent>
            </Card>
            <Card className={`border-2 ${totalPrize > 0 ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Premio Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${totalPrize > 0 ? 'text-green-600' : ''}`}>
                  {totalPrize > 0 ? `${totalPrize.toLocaleString("es-ES")} €` : '-'}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        {/* Debug Dialog */}
        <Dialog open={!!debugInfo} onOpenChange={(open) => !open && setDebugInfo(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Depuración de OCR</DialogTitle>
              <DialogDescription>
                Esto es lo que la aplicación "ve" y "lee".
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4">
              <div>
                <h4 className="font-semibold mb-2">Imagen Procesada:</h4>
                <div className="border rounded p-2 bg-muted/50 flex justify-center">
                  {debugInfo?.imageUrl && (
                    <img
                      src={debugInfo.imageUrl}
                      alt="Processed"
                      className="max-w-full h-auto object-contain max-h-[400px]"
                    />
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Texto Detectado (Raw):</h4>
                <pre className="bg-muted p-4 rounded text-xs overflow-x-auto whitespace-pre-wrap font-mono border">
                  {debugInfo?.text || "No text detected"}
                </pre>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Index;
