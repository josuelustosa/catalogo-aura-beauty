/** @OnlyCurrentDoc */

/**
 * Publicação do catálogo a partir da planilha. Instalação (dev, uma vez):
 * colar em Extensões → Apps Script, criar a propriedade de script
 * VERCEL_DEPLOY_HOOK_URL com a URL do Deploy Hook da main (segredo: se vazar,
 * recrie o hook na Vercel) e executar setupPublishing no editor, autorizando.
 */

const PUBLISH_SHEET = "publicar";
const PUBLISH_CHECKBOX = "B2";
const PUBLISH_STATUS = "B4";
const PRODUCTS_SHEET = "produtos";

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Aura Beauty")
    .addItem("Publicar alterações", "publishFromMenu")
    .addToUi();
}

/** Caminho do computador: menu com conferência e confirmação. */
function publishFromMenu() {
  const ui = SpreadsheetApp.getUi();
  const report = buildPreflightReport();

  if (report.blocker) {
    ui.alert("Publicação bloqueada", report.blocker, ui.ButtonSet.OK);
    return;
  }

  const answer = ui.alert(
    "Publicar alterações",
    report.summary + "\n\nPublicar o site agora?",
    ui.ButtonSet.YES_NO,
  );
  if (answer !== ui.Button.YES) {
    return;
  }

  const result = triggerDeploy();
  ui.alert(
    result.ok ? "Publicação enviada" : "Não foi possível publicar",
    result.message,
    ui.ButtonSet.OK,
  );
}

/** Caminho do celular: gatilho não abre janela, o resultado vai para a célula. */
function onPublishCheckbox(event) {
  const range = event.range;
  const sheet = range.getSheet();
  if (
    sheet.getName() !== PUBLISH_SHEET ||
    range.getA1Notation() !== PUBLISH_CHECKBOX ||
    range.getValue() !== true
  ) {
    return;
  }

  range.setValue(false);
  const status = sheet.getRange(PUBLISH_STATUS);
  status.setValue("Publicando…");

  const report = buildPreflightReport();
  if (report.blocker) {
    status.setValue("Bloqueado: " + report.blocker);
    return;
  }

  const result = triggerDeploy();
  status.setValue(result.message + " (" + report.summary + ")");
}

/** Roda uma vez, pelo dev: cria a aba "publicar" e o gatilho da caixa. */
function setupPublishing() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  let sheet = spreadsheet.getSheetByName(PUBLISH_SHEET);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(PUBLISH_SHEET);
    sheet.getRange("A2").setValue("Marque a caixa para publicar o site:");
    sheet.getRange(PUBLISH_CHECKBOX).insertCheckboxes();
    sheet.getRange("A4").setValue("Último resultado:");
    sheet.setColumnWidth(1, 260);
    sheet.setColumnWidth(2, 420);
  }

  const alreadyInstalled = ScriptApp.getProjectTriggers().some(
    (trigger) => trigger.getHandlerFunction() === "onPublishCheckbox",
  );
  if (!alreadyInstalled) {
    ScriptApp.newTrigger("onPublishCheckbox")
      .forSpreadsheet(spreadsheet)
      .onEdit()
      .create();
  }
}

/** Conferência leve com as regras do build; quem decide continua sendo o build. */
function buildPreflightReport() {
  const sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PRODUCTS_SHEET);
  if (!sheet) {
    return { blocker: 'A aba "' + PRODUCTS_SHEET + '" não foi encontrada.' };
  }

  const rows = sheet.getDataRange().getValues().slice(1);
  const seenIds = {};
  let active = 0;
  let inactive = 0;
  const problems = [];

  rows.forEach(function (row, index) {
    const line = index + 2;
    const hasData = row.slice(0, 6).some(function (cell) {
      return cell !== "" && cell !== null && String(cell).trim() !== "";
    });
    if (!hasData) {
      return;
    }

    const id = String(row[0]).trim();
    if (id) {
      if (seenIds[id]) {
        problems.push(
          "id repetido " + id + " (linhas " + seenIds[id] + " e " + line + ")",
        );
      } else {
        seenIds[id] = line;
      }
    }

    if (row[6] !== true) {
      inactive++;
      return;
    }

    active++;
    if (!id || String(row[2]).trim() === "" || !(Number(row[3]) > 0)) {
      problems.push("linha " + line + " incompleta (id, título ou preço)");
    }
  });

  const duplicates = problems.filter(function (problem) {
    return problem.indexOf("id repetido") === 0;
  });
  if (duplicates.length > 0) {
    return {
      blocker:
        "Corrija antes de publicar: " +
        duplicates.join("; ") +
        ". Um id repetido faz a publicação inteira falhar.",
    };
  }

  let summary = active + " produto(s) ativo(s), " + inactive + " inativo(s).";
  if (active === 0) {
    summary +=
      ' ATENÇÃO: nenhum produto está com a caixa "ativo" marcada — o site ficaria vazio.';
  }
  if (problems.length > 0) {
    summary += " Serão ignoradas: " + problems.join("; ") + ".";
  }

  return { blocker: null, summary: summary };
}

/** Dispara o Deploy Hook da Vercel. */
function triggerDeploy() {
  const hookUrl = PropertiesService.getScriptProperties().getProperty(
    "VERCEL_DEPLOY_HOOK_URL",
  );
  if (!hookUrl) {
    return {
      ok: false,
      message:
        "A publicação ainda não foi configurada (falta a propriedade " +
        "VERCEL_DEPLOY_HOOK_URL). Fale com o desenvolvedor.",
    };
  }

  try {
    const response = UrlFetchApp.fetch(hookUrl, {
      method: "post",
      muteHttpExceptions: true,
    });
    const code = response.getResponseCode();
    if (code >= 200 && code < 300) {
      return {
        ok: true,
        message:
          "Publicação enviada. O site atualiza em cerca de 3 minutos. Se os " +
          "dados tiverem algum problema, o site continua na versão anterior.",
      };
    }
    return {
      ok: false,
      message:
        "A Vercel respondeu com o código " +
        code +
        ". Tente de novo em alguns minutos.",
    };
  } catch (error) {
    return {
      ok: false,
      message: "Falha de conexão com a Vercel: " + error + ".",
    };
  }
}
