# Grand Shoot

Prototipo web **ispirato** ai classici giochi sandbox top-down anni '90 (stile GTA2), sviluppato con HTML5 Canvas.

## Avvio rapido

```bash
python3 -m http.server 4173
```

Apri poi `http://localhost:4173`.

## Come iniziare

1. Scegli la difficoltà dal pannello sinistro.
2. Clicca **Inizia partita**.
3. Usa tastiera/frecce per giocare.

## Grafica

Visuale top-down con strade multilane, marciapiedi, isolati con palazzi/parchi, pedoni e auto con sprite disegnati via Canvas.

## Controlli

- `WASD` / Frecce: movimento o guida
- `Shift`: sprint a piedi
- `Spazio`: entra/esci dal veicolo più vicino
- `R`: riavvia la partita

## Nota legale

Questo progetto usa grafica e logica **originali**, senza asset ufficiali o contenuti proprietari di GTA2.

## Risoluzione conflitti GitHub

Se in PR vedi marker tipo `<<<<<<<`, `=======`, `>>>>>>>`, significa che il file è stato mergiato male.

Passi consigliati:

```bash
git fetch origin
git checkout <tuo-branch>
git rebase origin/main
# risolvi i conflitti nei file
git add game.js index.html styles.css README.md
git rebase --continue
git push --force-with-lease
```

Dopo la risoluzione verifica che nei file non esistano marker di conflitto:

```bash
rg -n "^(<<<<<<<|=======|>>>>>>>)" game.js index.html styles.css README.md
```

### Risoluzione rapida da GitHub UI

1. Apri la PR e clicca **Resolve conflicts**.
2. In ogni file, scegli una sola versione oppure unisci manualmente il codice.
3. Rimuovi completamente i marker `<<<<<<<`, `=======`, `>>>>>>>`.
4. Clicca **Mark as resolved** e poi **Commit merge**.

### Controllo automatico (consigliato)

Questo repository include anche uno script locale e una GitHub Action per bloccare push/PR con marker irrisolti:

```bash
./scripts/check-conflict-markers.sh
```
