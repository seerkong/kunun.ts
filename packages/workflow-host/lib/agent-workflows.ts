// kwf agent (scaffold wizard) workflows — the two-step shape only.
//
// The design/infer SYSTEM prompts are no longer hard-coded here. They are
// assembled at runtime from layered Markdown assets (universal + kwf + step +
// Kon cheatsheet + scenario index — see prompt-assembly.ts) and injected via the
// `system_prompt` arg. Concrete business-scenario patterns live as on-demand
// skills (skill/scenarios/<name>/) that the design agent fetches itself with
// `kwf skill show <name>`. The prompt *content* lives in
// packages/workflow-host/assets/prompts/ and skill/scenarios/, NOT in this file.
//
// `(args.:requirement)` / `(args.:system_prompt)` / `(args.:workflow_source)`:
// runWorkflow args do NOT merge into :input automatically; :input must pull each
// runtime value from the `args` global explicitly.

export const SCAFFOLD_WORKFLOW_SOURCE = `
(ai_workflow #scaffoldWorkflow
  :input = {requirement = (args.:requirement) system_prompt = (args.:system_prompt)}
  :output = [scaffold]
  :[
    (ai_phase #Design
      :[
        (var scaffold (ai_agent #design :{
          sys_prompt =
          """
          \\(system_prompt)
          """
          user_prompt =
          """
          The user's requirement is below. THIS is the subject your workflow must
          actually research and perform, written in the user's own language:

          \\(requirement)

          Write the one kunun Kon-DSL workflow that fulfils EXACTLY this requirement.
          The :input default subject/topic, every agent's search and fetch focus, and
          all user-facing text — above all the final report — MUST come from and match
          the requirement above. Do NOT drift the subject toward workflows, agents,
          kon, or this tooling. Write the final deliverable in the SAME language as the
          requirement above (a Chinese requirement means a Chinese report).
          """
          output_schema = {
            type = "object"
            properties = {
              workflow_source = {type = "string"}
              workflow_name   = {type = "string"}
              description     = {type = "string"}
            }
            required = ["workflow_source" "workflow_name" "description"]
          }
        }))
      ])
  ])
`;

export const INFER_INPUT_SOURCE = `
(ai_workflow #inferWorkflowInput
  :input = {requirement = (args.:requirement) workflow_source = (args.:workflow_source) system_prompt = (args.:system_prompt)}
  :output = [inference]
  :[
    (ai_phase #Infer
      :[
        (var inference (ai_agent #infer :{
          sys_prompt =
          """
          \\(system_prompt)
          """
          user_prompt =
          """
          Workflow source:
          \\(workflow_source)

          Original requirement:
          \\(requirement)

          Generate the args object to pass when running this workflow.
          """
          output_schema = {
            type = "object"
            properties = {
              args        = {type = "object"}
              explanation = {type = "string"}
            }
            required = ["args"]
          }
        }))
      ])
  ])
`;
