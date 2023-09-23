#!/bin/bash

if [[ -f './browser-history-cleaner.zip' ]]; then
  \rm -i './browser-history-cleaner.zip'
  if [[ -f './browser-history-cleaner.zip' ]]; then
    echo >&2 'Cannot continue while the old .zip exists'
    exit 1
  fi
fi

echo "Zipping..."
zip -r -q './browser-history-cleaner.zip' res/ src/ manifest.json