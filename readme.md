# Generator de Subtitrări Automate

Această aplicație Docker oferă o soluție completă pentru generarea automată de subtitrări în limba română pentru videoclipuri, cu posibilități de personalizare a stilului și poziționării subtitrărilor.

## Caracteristici

- Încărcare și previzualizare video
- Generare automată de transcriere în limba română folosind Whisper
- Editare manuală a subtitrărilor generate
- Personalizare avansată a stilului subtitrărilor:
  - Font și mărime
  - Culoare text și contur
  - Grosime contur
  - Poziționare flexibilă (sus, centru, jos, colțuri)
- Generare video final cu subtitrări încorporate
- Interfață web accesibilă de pe orice dispozitiv

## Cerințe de sistem

- Docker și Docker Compose
- Minim 4GB RAM recomandat
- Aproximativ 2GB spațiu pe disc pentru imagini Docker
- Conexiune la internet pentru construirea inițială a imaginilor Docker

## Instalare și pornire

1. Clonați sau descărcați acest repository

2. Deschideți un terminal și navigați la directorul proiectului

3. Creați directoarele necesare pentru loguri:
```bash
mkdir -p nginx/logs
```

4. Construiți și porniți containerele Docker:

```bash
docker-compose up -d --build
```

5. Aplicația va fi accesibilă la adresa: http://localhost

## Utilizare

### 1. Încărcarea videoclipului

- Apăsați pe butonul pentru a alege un fișier video
- Selectați videoclipul dorit de pe dispozitiv
- Apăsați butonul "Încarcă Video"

### 2. Generarea subtitrărilor

- După ce videoclipul a fost încărcat, apăsați "Generează subtitrări"
- Acest proces poate dura câteva minute, în funcție de lungimea videoclipului
- Sistemul va folosi modelul Whisper pentru a transcrie automat conținutul audio

### 3. Editarea și personalizarea subtitrărilor

- Subtitrările generate vor fi afișate într-o listă
- Puteți edita textul oricărei subtitrări apăsând pe butonul "Editează"
- Personalizați stilul subtitrărilor folosind controalele disponibile:
  - Alegeți fontul dorit
  - Ajustați mărimea textului
  - Schimbați culoarea textului
  - Adăugați un contur și alegeți culoarea acestuia
  - Selectați poziția subtitrărilor pe ecran

### 4. Crearea videoclipului final

- După ce ați terminat de editat și personalizat subtitrările, apăsați "Creează videoclip cu subtitrări"
- Procesul de generare poate dura câteva minute
- După finalizare, puteți descărca videoclipul cu subtitrări încorporate

## Structura tehnică

Aplicația este împărțită în trei componente principale:

### Frontend (React)

- Interfață utilizator intuitivă
- Previzualizare video în timp real
- Editor de subtitrări
- Personalizare vizuală a stilurilor

### Backend (Python/Flask)

- API REST pentru comunicarea cu frontend-ul
- Integrare cu modelul Whisper pentru transcriere automată
- Procesare video cu FFmpeg pentru încorporarea subtitrărilor
- Stocare temporară a fișierelor încărcate și procesate

### Nginx

- Reverse proxy pentru a gestiona comunicarea între frontend și backend
- Configurație optimizată pentru încărcări de fișiere mari
- Suport pentru WebSockets necesare dezvoltării React

## Probleme cunoscute și limitări

- Transcrierea în limba română poate fi mai puțin precisă pentru videoclipuri cu zgomot de fundal sau vorbire rapidă
- Procesarea videoclipurilor lungi poate dura mai mult timp
- Mărimea maximă a fișierului este limitată la 3GB (poate fi modificată în fișierul docker-compose.yml)

## Personalizare

Pentru a modifica limitările sau comportamentul aplicației, editați fișierul `docker-compose.yml`:

```yaml
environment:
  - WHISPER_MODEL=base  # alegeți între base, small, medium, sau large
  - MAX_UPLOAD_SIZE=3000MB  # mărimea maximă pentru fișierele încărcate
```

### Alte personalizări posibile:

1. Schimbarea modelului Whisper:
   - `base`: Mai rapid, mai puțin precis (implicit)
   - `small`: Echilibru bun între viteză și precizie
   - `medium`: Precizie bună, dar mai lent
   - `large`: Cea mai bună precizie, dar foarte lent

2. Ajustarea limitelor de timp în nginx.conf:
   ```
   proxy_read_timeout 600;
   proxy_connect_timeout 600;
   proxy_send_timeout 600;
   ```

## Depanare

Dacă întâmpinați probleme, verificați logurile:

```bash
# Loguri pentru toate serviciile
docker-compose logs

# Loguri specifice pentru un serviciu
docker-compose logs nginx
docker-compose logs frontend
docker-compose logs backend
```

## Licență

Acest proiect este distribuit sub licența MIT. Este gratuit pentru utilizare personală și comercială.

## Resurse utilizate

- Whisper de la OpenAI pentru recunoașterea vocii
- FFmpeg pentru procesarea video
- React pentru interfața utilizator
- Flask pentru backend API
- Docker pentru containerizare
- Nginx pentru reverse proxy

---

Pentru întrebări sau probleme, deschideți un issue în repository-ul GitHub.