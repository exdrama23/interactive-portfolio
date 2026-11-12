# Backup — grade de tecnologias (versão 2D/plana)

Snapshot feito antes de aplicar o visual 3D nos quadrados.

Arquivos:

- `tech-relay.tsx` → snapshot de `src/components/ui/tech-relay.tsx` (grade plana)
- `tecnologias.tsx` → snapshot de `src/pages/tecnologias.tsx` (importava a versão plana)
- `Index.tsx` → snapshot de `src/pages/Index.tsx`

## Como reverter ("retorne")

1. Copie `tecnologias.tsx` de volta para `src/pages/tecnologias.tsx`
   (o único diff é `tech-relay-3d` → `tech-relay` no import).
2. Opcional: apague `src/components/ui/tech-relay-3d.tsx`.
3. `Index.tsx` não muda entre as versões.

O `src/components/ui/tech-relay.tsx` (versão plana) continua intacto no projeto,
então o revert é só trocar o import de volta.
