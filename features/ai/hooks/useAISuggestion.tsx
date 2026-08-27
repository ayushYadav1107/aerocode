import { useState, useCallback} from "react";
import { editor } from "monaco-editor";

interface AISuggestionsState{
    suggestion:string | null;
    isLoading:boolean;
    position:{line:number; column:number} | null;
    decoration:string[];
    isEnabled:boolean;
}

interface UseAISuggestionsReturn extends AISuggestionsState{
    toggleEnabled: ()=>void;
    fetchSuggestion:(type:string, editor:any)=>Promise<void>;
    acceptSuggestion:(editor:any, monaco:any)=>void;
    rejectSuggestion:(editor:any)=>any;
    clearSuggestion:(editor:any)=>void;
}

export const useAISuggestions = ():UseAISuggestionsReturn=>{
    const [state, setState] = useState<AISuggestionsState>({
        suggestion:null,
        isLoading:false,
        position:null,
        decoration:[],
        isEnabled:true
    });

    const toggleEnabled = useCallback(
        ()=>{
        setState((prev)=>({...prev, isEnabled : !prev.isEnabled}))   
        },[]
    );

    const fetchSuggestion = useCallback(async(type:string, editor:any)=>{
        setState((currentState)=>{
            if(!currentState.isEnabled){
                console.warn("Ai suggestions are disabled")
                return currentState;
            }

            if(!editor){
                console.warn("Editor instance is not available");
                return currentState;
            }

            const model = editor.getModel();
            const cursorPosition = editor.getPosition();

            if(!model || !cursorPosition){
                console.warn("Editor model or cursor position is not available.");
                return currentState;
            }

            const newState = {...currentState, isLoading:true}

            //performing the aysnc operation
            {
                async ()=>{
                    
                }
            }
        })
    },[])
};