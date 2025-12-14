import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Mic } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Message {
    role: "user" | "assistant";
    content: string;
}

export function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: "Hello! I'm your health assistant. Ask me anything about your health metrics or general health questions." }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [language, setLanguage] = useState("English");
    const [isListening, setIsListening] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const startListening = () => {
        if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
            const recognition = new SpeechRecognition();

            // Map languages to BCP 47 tags
            const langMap: Record<string, string> = {
                "English": "en-US",
                "Hindi": "hi-IN",
                "Odia": "or-IN",
                "Bengali": "bn-IN",
                "Telugu": "te-IN",
                "Tamil": "ta-IN"
            };

            recognition.lang = langMap[language] || "en-US";
            recognition.continuous = false;
            recognition.interimResults = false;

            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setInput(transcript);
            };

            recognition.start();
        } else {
            alert("Voice input is not supported in this browser.");
        }
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput("");
        setMessages(prev => [...prev, { role: "user", content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMessage, language }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || "Failed to get response");
            }

            setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
        } catch (error) {
            console.error("Chat error:", error);
            let errorMessage = "Sorry, I encountered an error. Please try again.";
            if (error instanceof Error) {
                errorMessage += ` (${error.message})`;
            }
            setMessages(prev => [...prev, { role: "assistant", content: errorMessage }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            onClick={() => setIsOpen(!isOpen)}
                            className={cn(
                                "fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl transition-all duration-300 z-[9999]",
                                "bg-gradient-to-br from-primary to-primary/80 border-4 border-white/10 backdrop-blur-sm",
                                "hover:scale-110 hover:shadow-primary/40",
                                isOpen ? "rotate-90 from-destructive to-destructive/80 hover:bg-destructive" : "hover:bg-primary"
                            )}
                        >
                            {isOpen ? <X className="h-8 w-8 text-white" /> : <MessageCircle className="h-8 w-8 text-white" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="mr-2 px-3 py-1.5 text-sm font-medium bg-primary/90 text-primary-foreground border-none shadow-lg backdrop-blur-sm">
                        <p>{isOpen ? "Close Assistant" : "AI Health Assistant"}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {/* Pulse Effect (only when closed) */}
            {!isOpen && (
                <div className="fixed bottom-6 right-6 h-16 w-16 rounded-full bg-primary/30 animate-ping z-[9998] pointer-events-none" />
            )}

            {/* Chat Window */}
            <div
                className={cn(
                    "fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-[400px] transition-all duration-300 z-[9999]",
                    isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
                )}
            >
                <Card className="border-primary/20 shadow-xl w-full">
                    <CardHeader className="bg-primary/5 p-4 rounded-t-lg flex flex-col gap-3">
                        <div className="flex flex-row items-center justify-between w-full">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <MessageCircle className="h-5 w-5 text-primary" />
                                Health Assistant
                            </CardTitle>
                            <Select value={language} onValueChange={setLanguage}>
                                <SelectTrigger className="w-[100px] h-8 text-xs">
                                    <SelectValue placeholder="Lang" />
                                </SelectTrigger>
                                <SelectContent className="z-[10000]">
                                    <SelectItem value="English">English</SelectItem>
                                    <SelectItem value="Hindi">Hindi</SelectItem>
                                    <SelectItem value="Odia">Odia</SelectItem>
                                    <SelectItem value="Bengali">Bengali</SelectItem>
                                    <SelectItem value="Telugu">Telugu</SelectItem>
                                    <SelectItem value="Tamil">Tamil</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[400px] p-4">
                            <div className="flex flex-col gap-4">
                                {messages.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "flex w-fit max-w-[85%] flex-col gap-2 rounded-lg px-3 py-2 text-sm break-words whitespace-pre-wrap",
                                            msg.role === "user"
                                                ? "ml-auto bg-primary text-primary-foreground"
                                                : "bg-muted"
                                        )}
                                    >
                                        {msg.content}
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex w-max max-w-[80%] flex-col gap-2 rounded-lg px-3 py-2 text-sm bg-muted">
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Thinking...
                                        </div>
                                    </div>
                                )}
                                <div ref={scrollRef} />
                            </div>
                        </ScrollArea>
                    </CardContent>
                    <CardFooter className="p-4 border-t">
                        <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
                            <Input
                                placeholder="Ask about your health..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                className="flex-1"
                            />
                            <Button
                                type="button"
                                size="icon"
                                variant={isListening ? "destructive" : "secondary"}
                                onClick={startListening}
                                disabled={isLoading}
                            >
                                <Mic className={cn("h-4 w-4", isListening && "animate-pulse")} />
                            </Button>
                            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </CardFooter>
                </Card>
            </div>
        </>
    );
}
