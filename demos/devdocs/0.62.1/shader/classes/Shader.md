# Class: Shader

Defined in: [shader.ts:41](https://github.com/niivue/niivue/blob/main/packages/niivue/src/shader.ts#L41)

## Constructors

### Constructor

```ts
new Shader(
   gl: WebGL2RenderingContext,
   vertexSrc: string,
   fragmentSrc: string): Shader;
```

Defined in: [shader.ts:47](https://github.com/niivue/niivue/blob/main/packages/niivue/src/shader.ts#L47)

#### Parameters

| Parameter     | Type                     |
| ------------- | ------------------------ |
| `gl`          | `WebGL2RenderingContext` |
| `vertexSrc`   | `string`                 |
| `fragmentSrc` | `string`                 |

#### Returns

`Shader`

## Properties

| Property                              | Type                                                   | Default value | Defined in                                                                                   |
| ------------------------------------- | ------------------------------------------------------ | ------------- | -------------------------------------------------------------------------------------------- |
| <a id="iscrosscut"></a> `isCrosscut?` | `boolean`                                              | `undefined`   | [shader.ts:45](https://github.com/niivue/niivue/blob/main/packages/niivue/src/shader.ts#L45) |
| <a id="ismatcap"></a> `isMatcap?`     | `boolean`                                              | `undefined`   | [shader.ts:44](https://github.com/niivue/niivue/blob/main/packages/niivue/src/shader.ts#L44) |
| <a id="program"></a> `program`        | `WebGLProgram`                                         | `undefined`   | [shader.ts:42](https://github.com/niivue/niivue/blob/main/packages/niivue/src/shader.ts#L42) |
| <a id="uniforms"></a> `uniforms`      | `Record`\<`string`, `WebGLUniformLocation` \| `null`\> | `{}`          | [shader.ts:43](https://github.com/niivue/niivue/blob/main/packages/niivue/src/shader.ts#L43) |

## Methods

### use()

```ts
use(gl: WebGL2RenderingContext): void;
```

Defined in: [shader.ts:74](https://github.com/niivue/niivue/blob/main/packages/niivue/src/shader.ts#L74)

#### Parameters

| Parameter | Type                     |
| --------- | ------------------------ |
| `gl`      | `WebGL2RenderingContext` |

#### Returns

`void`
