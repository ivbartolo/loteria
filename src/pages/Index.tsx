import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Sparkles, Camera, Image } from "lucide-react";
import { toast } from "sonner";
import { createWorker } from 'tesseract.js';

interface LotteryNumber {
  id: string;
  number: string;
  name: string;
  addedAt: Date;
  prize?: number;
}

const Index = () => {
  const [numbers, setNumbers] = useState<LotteryNumber[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [nameValue, setNameValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [prizeResults, setPrizeResults] = useState<Map<string, number>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("lotteryNumbers");
    if (stored) {
      const parsed = JSON.parse(stored);
      setNumbers(parsed.map((n: any) => ({ ...n, addedAt: new Date(n.addedAt) })));
    }
  }, []);

  useEffect(() => {
    if (numbers.length > 0) {
      localStorage.setItem("lotteryNumbers", JSON.stringify(numbers));
    }
  }, [numbers]);

  const addNumber = () => {
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

    const newNumber: LotteryNumber = {
      id: Date.now().toString(),
      number: trimmed,
      name: trimmedName,
      addedAt: new Date(),
      prize: prizeResults.get(trimmed),
    };

    setNumbers([newNumber, ...numbers]);
    setInputValue("");
    setNameValue("");
    toast.success("Número añadido correctamente");
  };

  const removeNumber = (id: string) => {
    setNumbers(numbers.filter(n => n.id !== id));
    toast.success("Número eliminado");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addNumber();
    }
  };

  const processImage = async (file: File) => {
    setIsProcessing(true);
    toast.info("Procesando imagen...");
    
    try {
      const worker = await createWorker('spa');
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();
      
      // Buscar números de 5 dígitos en el texto
      const fiveDigitNumbers = text.match(/\b\d{5}\b/g);
      
      if (fiveDigitNumbers && fiveDigitNumbers.length > 0) {
        // Tomar el primer número de 5 dígitos encontrado
        setInputValue(fiveDigitNumbers[0]);
        toast.success("Número detectado: " + fiveDigitNumbers[0]);
      } else {
        toast.error("No se detectó ningún número de 5 dígitos");
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
      
      setPrizeResults(results);
      
      // Actualizar números existentes con premios
      const updatedNumbers = numbers.map(n => ({
        ...n,
        prize: results.get(n.number)
      }));
      setNumbers(updatedNumbers);
      
      const winnersCount = updatedNumbers.filter(n => n.prize).length;
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
                onClick={addNumber}
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
                  className="group relative overflow-hidden border-2 hover:border-primary transition-all duration-300 hover:shadow-festive"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-3xl font-bold text-primary mb-2">
                          {item.number}
                        </p>
                        <p className="text-sm font-medium text-foreground mb-1">
                          {item.name}
                        </p>
                        {item.prize && (
                          <p className="text-lg font-bold text-green-600 mb-1">
                            ¡Premio: {item.prize.toLocaleString("es-ES")} €!
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Añadido el {new Date(item.addedAt).toLocaleDateString("es-ES")}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeNumber(item.id)}
                        className="opacity-60 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
