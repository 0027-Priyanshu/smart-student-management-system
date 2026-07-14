import { translateNlSearch } from './src/services/ai.service';
async function test() {
  const result = await translateNlSearch('attendance below 100');
  console.log('Result:', result);
}
test();
