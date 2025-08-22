const { GigaChat } = require('gigachat');

async function testGigaChat() {
  try {
    const giga = new GigaChat({
      credentials: 'N2FjYTczM2MtODgyYy00NWE4LWI2NjItYTQ4NTgzMTQ0ZDFkOjUzMjc5OTM4LTRmMDYtNGJiZC05MjI4LWZhZTIxZmM1ODk1Mg==',
      scope: "GIGACHAT_API_PERS",
      model: 'GigaChat',
      verify_ssl_certs: false,
    });

    let response = await giga.chat({
      messages: [{ role: 'user', content: 'Расскажи о себе в двух словах?' }],
    });
    console.log('Ответ:', response.choices[0]?.message.content);
    
    let responseWithSystem = await giga.chat({
      messages: [
        { role: 'system', content: 'Ты - полезный ассистент, который всегда отвечает кратко и по делу.' },
        { role: 'user', content: 'Расскажи о себе в двух словах?' }
      ],
    });
    console.log('Ответ с системным промптом:', responseWithSystem.choices[0]?.message.content);
    
    let responseSystemOnly = await giga.chat({
      messages: [
        { role: 'system', content: 'Ты - полезный ассистент, который всегда отвечает кратко и по делу.' }
      ],
    });
    console.log('Ответ только с системным промптом:', responseSystemOnly.choices[0]?.message.content);
  } catch (error) {
    console.error('Ошибка при обращении к API GigaChat:', error.message);
  }
}

testGigaChat();
