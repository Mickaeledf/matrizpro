import { ReactNode, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";

interface ConfirmOptions {
  titulo: string;
  descricao: ReactNode;
  confirmar?: string;
  onConfirm: () => void;
}

/**
 * Hook para confirmar ações destrutivas.
 * Uso: const { confirmar, dialog } = useConfirm(); ... confirmar({...}); ... {dialog}
 */
export function useConfirm() {
  const [opcoes, setOpcoes] = useState<ConfirmOptions | null>(null);

  const dialog = (
    <AlertDialog open={!!opcoes} onOpenChange={(open) => !open && setOpcoes(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{opcoes?.titulo}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>{opcoes?.descricao}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: "destructive" })}
            onClick={() => {
              opcoes?.onConfirm();
              setOpcoes(null);
            }}
          >
            {opcoes?.confirmar ?? "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirmar: setOpcoes, dialog };
}
