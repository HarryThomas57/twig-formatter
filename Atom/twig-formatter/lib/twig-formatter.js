'use babel';

import { CompositeDisposable } from 'atom';

export default {
  subscriptions: null,

  activate() {
    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'twig-formatter:oneLine': () => this.oneLine()
    }));
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'twig-formatter:beautify': () => this.beatutify()
    }));
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'twig-formatter:whitespace': () => this.whitespace()
    }));
  },

  deactivate() {
    this.subscriptions.dispose()
  },

  oneLine() {
    let editor
    if (editor =  atom.workspace.getActiveTextEditor()) {
      let selection = editor.getSelectedText();

      if(!selection || !selection.length) return

      var oneLineTwig = makeOneLineTwig(selection);
      editor.insertText(oneLineTwig);
    }
  },

  beatutify() {
    let editor
    if (editor =  atom.workspace.getActiveTextEditor()) {
      let selection = editor.getSelectedText();

      if(!selection || !selection.length) return

      var beautifiedTwig = beautifyTwig(selection);
      editor.insertText(beautifiedTwig);
    }
  },

  whitespace() {
    let editor
    if (editor =  atom.workspace.getActiveTextEditor()) {
      let selection = editor.getSelectedText();

      if(!selection || !selection.length) return

      var whitespaceTwig = toggleWhitespaceControl(selection);
      editor.insertText(whitespaceTwig);
    }
  },

};

function generateTabs(tabs) {
  tabString = "";
  for (var i = 0; i < tabs; i++) {
    tabString += "\t";
  }
  return tabString;
}

function removeLeadingAndTrailingTilde(twig) {
  if(!twig || !twig.length) return;

  const openPattern = /\{\{\s~/g;
  const closePattern = /~\s\}\}/g;

  twig = twig.replace(openPattern, "{{");
  twig = twig.replace(closePattern, "}}");
  return twig;
}

function makeOneLineTwig(twig) {
  if(!twig || !twig.length) return;

  const tabPattern = /^\s+/mg;
  const newLinePattern = /\n/g;

  twig = twig.replace(tabPattern, "");
  twig = twig.replace(newLinePattern, "");
  return twig;
}

function toggleWhitespaceControl( twig) {
  const matchPattern = /\{\{\-|\{\%\-/g;

  let matches = twig.match(matchPattern);
  
  if (matches) {
    twig = twig.replace(/\{\{\-/g, "{{");
    twig = twig.replace(/\{\%\-/g, "{%");
    twig = twig.replace(/\-\}\}/g, '}}');
    twig = twig.replace(/\-\%\}/g, '%}');
  } else {
    twig = twig.replace(/\{\{/g, "{{-");
    twig = twig.replace(/\{\%/g, "{%-");
    twig = twig.replace(/\}\}/g, '-}}');
    twig = twig.replace(/\%\}/g, '-%}');
  }

  return twig;
}

function beautifyTwig(twig) {
  twig = removeLeadingAndTrailingTilde(twig);

  const pattern = /((?:\{%-?|\{\{-?|\[\[)[^\}\]]+(?:\}|\])(?:\}|\])?)(?=((?:\{%-?|\{\{-?|\[\[)[^\}\]]+(?:\}|\])(?:\}|\])?))?/g;
  
  let matches = twig.match(pattern);
  var tabIndex = 0;
  var rep = ""; 
  var isDoubleLine = false;
  var beautifiedTwig = [];


  if (twig.includes("\n")) {
    console.log('Return Early')
    return twig;
  } else {
    for(var i = 0; i < matches.length; i++) {
      var tag = matches[i];
      var nextTag = matches[i+1];

      // set
      if (tag.includes("{% set") || tag.includes("{%- set")) {
        isDoubleLine = true;
        if (tag.includes("=")) {
          rep = `%${tag}\n%${generateTabs(tabIndex)}`;
        } else {
          rep = `%${tag}`
        }
      }

      // endset
      else if (tag.includes("{% endset") || tag.includes("{%- endset")) {
         isDoubleLine = true;
         rep = `${tag}\n${generateTabs(tabIndex)}`;
       }
        
       // if
      else if (tag.includes("{% if") || tag.includes("{%- if")) {
         tabIndex++;
         rep = `${isDoubleLine ? "\n" : ""}${tag}\n${generateTabs(tabIndex)}`;
       }

       // else and elseif
      else if (tag.includes("{% else") || tag.includes("{%- else")) {
          tabIndex--;
          rep = `${isDoubleLine ? "\n" : ""}\n${generateTabs(tabIndex)}${tag}\n${generateTabs(tabIndex)}\t`;
       }

       // endif
      else if (tag.includes("{% endif") || tag.includes("{%- endif")) {
        tabIndex--;
        if(nextTag != null && (nextTag.includes("{% if") || nextTag.includes("{%- if") || nextTag.includes("{% for") || nextTag.includes("{%- for") ||nextTag.includes("{{") || nextTag.includes("[["))) {
          rep = `${tag}`;
        } else {
          rep = `${isDoubleLine ? "\n" : ""}\n${generateTabs(tabIndex)}${tag}`;
        }
      }

      // for
      else if (tag.includes("{% for") || tag.includes("{%- for")) {
        tabIndex++;
        rep = `${isDoubleLine ? "\n" : ""}${tag}\n${generateTabs(tabIndex)}`;
      }

      // endif
      else if (tag.includes("{% endfor") || tag.includes("{%- endfor")) {
        tabIndex--;
        if(nextTag != null && (nextTag.includes("{% if") || nextTag.includes("{%- if") || nextTag.includes("{% for") || nextTag.includes("{%- for") ||nextTag.includes("{{") || nextTag.includes("[["))) {
          rep = `${tag}`;
        } else {
          rep = `${isDoubleLine ? "\n" : ""}\n${generateTabs(tabIndex)}${tag}`;
        }
      }

      // {{
      else if (tag.includes("{{")) {
        if(nextTag != null && (nextTag.includes("{% if") || nextTag.includes("{%- if") || nextTag.includes("{% for") || nextTag.includes("{%- for") ||nextTag.includes("{{") || nextTag.includes("[["))) {
          rep = `${isDoubleLine ? "\n" : ""}${tag}\n${generateTabs(tabIndex)}`;
        } else {
          rep = `${isDoubleLine ? "\n" : ""}${tag}`;
        }
      }

      // custom twig
      else if (tag.includes("[[")) {
        if (nextTag != null && (nextTag.includes("{% endset") || nextTag.includes("{%- endset"))) {
          rep = `${tag}`
        } else if (nextTag.includes("{% if") || nextTag.includes("{%- if") || nextTag.includes("{% for") || nextTag.includes("{%- for") ||nextTag.includes("{{") || nextTag.includes("[[")) {
          rep = `${isDoubleLine ? "\n" : ""}${tag}\n${generateTabs(tabIndex)}`;          
        } else {
          rep = `${isDoubleLine ? "\n" : ""}${tag}`
        }
      }

      //other
      else {
        rep = `${tag}`;
      } 

      if (isDoubleLine && !tag.includes("{% set") && !tag.includes("{%- set") && !tag.includes("{% endset") && !tag.includes("{%- endset")) {
        isDoubleLine = false;
      }

      beautifiedTwig.push(rep);
    } 
    return beautifiedTwig.join('');
  }
}