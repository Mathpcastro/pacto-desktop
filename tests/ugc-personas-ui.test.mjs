import assert from "node:assert/strict";
import test from "node:test";
import { slideHtml } from "../core/templates.mjs";
import {
  personaSaveLabel,
  profileFaceButton,
  savedAvatarNotice,
  tweetPreviewName,
} from "../src/components/ugc-personas-ui.mjs";

const avatar = { id: "marina", nome: "Marina", anchor: "data:image/png;base64,AA==" };

test("o mesmo card mantém o botão quando o avatar vira a cara do perfil", () => {
  assert.deepEqual(profileFaceButton(avatar, "outro"), {
    label: "Usar como cara do perfil",
    disabled: false,
  });
  assert.deepEqual(profileFaceButton(avatar, avatar.id), {
    label: "Cara do perfil",
    disabled: true,
  });
  assert.deepEqual(profileFaceButton(avatar, "outro", true), {
    label: "Usar como cara do perfil",
    disabled: true,
  });
  assert.equal(profileFaceButton({ ...avatar, anchor: "" }, "outro"), null);
});

test("enviar ou gerar uma âncora muda o rótulo de salvamento do rascunho", () => {
  const draft = { nome: avatar.nome };
  assert.equal(personaSaveLabel(draft), "Salvar rascunho");
  const uploadResult = { dataUrl: avatar.anchor };
  const generatedResult = { anchor: avatar.anchor };
  assert.equal(personaSaveLabel({ ...draft, anchor: uploadResult.dataUrl }), "Salvar avatar");
  assert.equal(personaSaveLabel({ ...draft, anchor: generatedResult.anchor }), "Salvar avatar");
});

test("só o avatar salvo com âncora oferece aplicar a cara do perfil", () => {
  const applied = [];
  const setProfileAvatar = (id) => applied.push(id);
  assert.equal(savedAvatarNotice({ ...avatar, anchor: "" }, setProfileAvatar), null);
  const notice = savedAvatarNotice(avatar, setProfileAvatar);
  assert.equal(notice.text, "Avatar salvo.");
  assert.equal(notice.actionLabel, "Usar como cara do perfil");
  assert.deepEqual(applied, []);
  notice.onAction();
  assert.deepEqual(applied, [avatar.id]);
});

test("a prévia do Tweet usa o Nome, a marca, o avatar vinculado ou o perfil atual", () => {
  const state = {
    profileId: "perfil-marina",
    profiles: [{ id: "outro", name: "Outro perfil" }, { id: "perfil-marina", name: "UGC Marina" }],
    media: { avatarPersonaId: avatar.id, avatar: avatar.anchor },
    personas: [{ id: "outro", nome: "Outro avatar" }, avatar],
    brandInfo: { name: "Marca do contexto" },
    profile: { brand: "Marca do formulário" },
  };
  assert.equal(tweetPreviewName("Nome editado", state), "Nome editado");
  assert.equal(tweetPreviewName("", state), "Marca do contexto");
  assert.equal(tweetPreviewName("", { ...state, brandInfo: {} }), "Marca do formulário");

  const noBrand = { ...state, brandInfo: {}, profile: {} };
  const html = slideHtml({
    style: "tweet",
    slide: { title: "Prévia" },
    brand: { name: tweetPreviewName("", noBrand), avatar: state.media.avatar },
  });
  assert.match(html, /<b[^>]*>Marina<\/b>/);
  assert.match(html, /<img class="avatar" src="data:image\/png;base64,AA=="[^>]+width:104px;height:104px/);
  assert.doesNotMatch(html, /Sua marca/);
  assert.equal(tweetPreviewName("", { ...noBrand, media: {} }), "UGC Marina");
  assert.equal(tweetPreviewName("", {}), "");
});
