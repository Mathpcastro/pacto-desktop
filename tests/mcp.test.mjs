import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

test('real stdio MCP exposes official resources, tools and exact source retrieval', async () => {
  const transport = new StdioClientTransport({command:process.execPath,args:[fileURLToPath(new URL('../mcp/server.mjs',import.meta.url))],stderr:'pipe',env:process.env.ELECTRON_RUN_AS_NODE?{ELECTRON_RUN_AS_NODE:process.env.ELECTRON_RUN_AS_NODE}:{}});
  const client = new Client({name:'pacto-verification',version:'0.1.0'});
  try {
    await client.connect(transport);
    const tools = await client.listTools();
    assert.equal(tools.tools.length,7);
    const resources=await client.listResources();
    assert.equal(resources.resources.length,23);
    const source=await client.callTool({name:'pacto_get_source',arguments:{id:'3c26af121ad181c79297ce0b11b65283'}});
    assert.equal(source.isError,undefined);
    assert.match(source.content[0].text,/Arquiteturas/);
    const invalid=await client.callTool({name:'pacto_get_lesson',arguments:{id:'../../auth.json'}});
    assert.equal(invalid.isError,true);
    const b=await client.callTool({name:'pacto_briefing',arguments:{profile:{brand:'Teste'}}});
    assert.equal(JSON.parse(b.content[0].text).complete,false);
    const lesson=await client.readResource({uri:'pacto://lesson/LWIanBtCUHg'});
    assert.match(lesson.contents[0].text,/continuity effect/i);
  } finally {await client.close();}
});
