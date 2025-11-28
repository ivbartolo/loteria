import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Sparkles, Camera, Image, Trophy, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { extractLotteryNumber } from "@/lib/gemini";
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

  const processImage = async (file: File) => {
    setIsProcessing(true);
    toast.info("Procesando imagen con IA...");

    try {
      // Use Gemini OCR to extract the lottery number
      const detectedNumber = await extractLotteryNumber(file);

      if (detectedNumber) {
        setInputValue(detectedNumber);
        toast.success(`Número detectado: ${detectedNumber}`);
        setDebugInfo(null); // Clear any previous debug info
      } else {
        toast.error("No se pudo detectar el número. Por favor, introdúcelo manualmente.");
        // Show debug dialog
        const imageUrl = URL.createObjectURL(file);
        setDebugInfo({
          imageUrl,
          text: "Gemini no pudo extraer un número de 5 dígitos de esta imagen"
        });
      }
    } catch (error) {
      console.error("Error processing image:", error);
      const errorMessage = error instanceof Error ? error.message : "Error al procesar la imagen";
      toast.error(errorMessage);

      // Show debug dialog with error
      const imageUrl = URL.createObjectURL(file);
      setDebugInfo({
        imageUrl,
        text: `Error: ${errorMessage}`
      });
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
