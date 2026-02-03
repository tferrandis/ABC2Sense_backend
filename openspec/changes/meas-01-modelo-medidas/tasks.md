## 1. Model Updates

- [x] 1.1 Add device_id field (String, optional) to Measurement schema
- [x] 1.2 Add notes field (String, optional) to Measurement schema

## 2. Controller Updates

- [x] 2.1 Add admin check to use body user_id if provided
- [x] 2.2 Add validation for numeric values in measurements array
- [x] 2.3 Update createMeasurement to accept device_id and notes
- [x] 2.4 Update apiDoc documentation

## 3. Testing

- [x] 3.1 Verify device_id and notes are saved correctly
- [x] 3.2 Verify admin can specify user_id
- [x] 3.3 Verify non-numeric values are rejected
