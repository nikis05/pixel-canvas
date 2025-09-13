for i in {1..20}; do curl -X 'POST' \
  'https://testnet.toncenter.com/api/v3/runGetMethod' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "address": "EQDB6ptYylAbUPOwW-TiVDkZvbW2dH49ipzgQT04KyTh6zIh",
  "method": "dna",
  "stack": []
}'; done