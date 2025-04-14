#!/bin/bash

# Script pentru crearea structurii de directoare și fișiere
# pentru Generatorul de Subtitrări Automate

# Creează directoarele necesare
mkdir -p frontend/public/
mkdir -p frontend/src/
mkdir -p backend/uploads/
mkdir -p backend/processed/
mkdir -p shared/

# Creează fișierele .gitkeep pentru a păstra directoarele goale în git
touch backend/uploads/.gitkeep
touch backend/processed/.gitkeep
touch shared/.gitkeep

# Copiază fișierele în locațiile corespunzătoare
# (Acesta este doar un exemplu, va trebui să creați fișierele separat)

echo "Structura de directoare și fișiere a fost creată cu succes!"
echo "Pentru a porni aplicația, rulați: docker-compose up -d"
