# CivicTrack AI — worldwide feature similarity review

Research date: **25 October 2026, Asia/Calcutta**.

**Finding:** the core combination of image-based civic detection, severity,
priority, generated complaint text and departmental routing is already publicly
described. Several public repositories also overlap with the wider workflow.
This review did **not establish one identical implementation of all eighteen
CivicTrack audit areas**, nor establish that no such implementation exists.
It is a preliminary international public-source search, not a patentability or
freedom-to-operate opinion. No competing application was executed or certified.

## Scope and evidence rules

Compared the actual feature definitions in the local
[implementation audit](CIVICTRACK_PHASE2_AUDIT_2026-10-25.md) and
[follow-up](PHASE2_PARTIAL_COMPLETION_2026-10-25.md), rather than treating the
project title or planned features as proof of a working implementation.
CivicTrack currently has experimental rule severity, deterministic detection-grounded
drafts and backend priority. Additional model classes and the live chatbot provider
remain blocked. These are not validated trained severity or language models.

Sources include research publishers, authors' public repositories, government
descriptions in Singapore and Thailand, UK and US product documentation, and
European, Chinese and US patent publications. Search used feature combinations,
not only the CivicTrack name. Example queries included civic + severity +
description + YOLO, civic complaints + duplicate + priority + chatbot,
photo-based municipal reporting, and urban-management image recognition patents.

Evidence labels:

- **C:** Relevant source code inspected statically; no runtime/accuracy claim.
- **D:** Described in the author's paper, repository or official documentation.
- **P:** Partial/different mechanism; not the full CivicTrack requirement.
- **R:** Explicitly listed as future work or missing in the inspected version.
- **U:** Not established from reviewed material. This does **not** mean absent.

Dates on Git commits are not proof of when a repository first became public.
The paper publication date is a publisher-reported date. No legal priority date
for the user's invention was supplied or inferred.

## The three original Phase 2 features, compared precisely

| Requirement | Public evidence found | Important difference or unverified detail |
|---|---|---|
| Low/Medium/High severity from detected civic issue and image evidence | CivicAI's [severity source](https://github.com/Sujit-1509/CivicAI/blob/065d7fe54b74655c2bdafef140c89caef303ec7e/backend/process_image/severity_rules.py) returns these levels plus a review state | Its rules use category/confidence; CivicTrack also considers valid boxes/image coverage and exposes experimental/uncertain metadata. Neither code inspection validates accuracy. |
| Priority based on severity/category and unresolved age, separate from status | CivicResolve's [risk source](https://github.com/aashishvarma0708-ai/ai-agent-hackathon/blob/3961926b76669b93faad795117da128249e0fbed/core/risk.py) includes category, safety/scale indicators and an unresolved-duration boost. CivicAI also has [priority code](https://github.com/Sujit-1509/CivicAI/blob/065d7fe54b74655c2bdafef140c89caef303ec7e/backend/process_image/priority_calculator.py). | CivicResolve uses different thresholds/factors. CivicAI's inspected function uses severity, category, confidence and nearby-report count, without an age input. Exact CivicTrack weights/override policy were not matched. |
| Detection-grounded generated description, citizen review/edit, valid location and no invented facts | CivicAI's [handler](https://github.com/Sujit-1509/CivicAI/blob/065d7fe54b74655c2bdafef140c89caef303ec7e/backend/process_image/lambda_function.py) calls text generation after detection/severity/routing. A separate [citizen-grievance repository](https://github.com/SANDHIYAPRIYADHARSHINI/citizen-grievance) explicitly documents editable photo-generated complaint text. | CivicAI's [generator](https://github.com/Sujit-1509/CivicAI/blob/065d7fe54b74655c2bdafef140c89caef303ec7e/backend/process_image/prompt_builder.py) receives category/severity and an S3 URI, not CivicTrack's structured visual evidence. Documentation/prompt wording does not prove freedom from hallucinations. Full citizen-approval/location safeguards were not established as identical. |

There is also a **single published work describing all three broad capabilities
together**: [the YOLOv8–LLM civic infrastructure paper](https://matjournals.net/engineering/index.php/JOCSES/article/view/4178),
published **25 September 2026**. Its abstract describes detection, severity,
description generation, departmental routing and geospatial priority. The full
article requires a subscription and was not reviewed. Exact scoring, editable
approval behavior and operational reliability therefore remain unverified.

This establishes close conceptual overlap, not an identical algorithm or proof
that either author copied the other.

## Comparison across all eighteen audit areas

These cells concern the named capability, **not equality of every condition or
security safeguard**. Read P/U cells and the source notes before inferring a match.

Columns reference [CivicAI](https://github.com/Sujit-1509/CivicAI),
[CivicResolve](https://github.com/aashishvarma0708-ai/ai-agent-hackathon),
[CivicLens](https://github.com/aayushmalve/civiclens), and
[CivicPulse's project documentation](https://github.com/ifreen22/CivicPulse/blob/main/CivicPulse_Project_Documentation.txt).

| CivicTrack audit area | CivicAI | CivicResolve | CivicLens | CivicPulse |
|---|---|---|---|---|
| 1. Independently configured multiple civic detectors | P | P | P | P |
| 2. Severity assessment | C | P | D | P |
| 3. Complaint priority scoring/review | C | C | U | D |
| 4. Generated complaint description | C | P | D | P |
| 5. Duplicate complaint detection/handling | P | D | R | D |
| 6. Civic assistance chatbot | U | D | U | U |
| 7. Authority dashboard/analytics | D | D | P | D |
| 8. Geographic hotspots/filtered map | U | D | P | P |
| 9. Category-to-department assignment | C | D | D | P |
| 10. Before/after repair evidence/review | U | D | D | U |
| 11. Resolution-duration analytics | U | P | U | D |
| 12. Live complaint notifications | P | D | U | D |
| 13. OTP signup verification | P | U | R | U |
| 14. Resolution email/SMS delivery | P | P | U | P |
| 15. Notification preferences/consent | U | D | U | U |
| 16. Citizen/authority complaint workflow | D | D | P | D |
| 17. Responsive mobile/tablet/web UI | D | U | U | U |
| 18. Equivalent security/reliability safeguards | U | P | R | P |

Important reading notes:

- **CivicAI:** YOLO plus vision fallback differs from an independent category-model
  registry. Nearby-report counts are not the same duplicate review workflow. Its
  README includes demonstration OTP/mock behavior, so real OTP delivery is not
  certified here. Creation email is not evidence of resolution email/SMS.
- **CivicResolve:** Covers chat, risk/routing, geographic aggregation, repair evidence
  and consented messaging in its documentation. Its AI/SQLite workflow differs
  from CivicTrack's YOLO/Express/MongoDB system. An SLA clock does not establish
  actual average/median resolution-duration analytics.
- **CivicLens:** Acknowledges prototype status, missing authority authentication
  and future duplicate improvements. A point map is not a proven filtered hotspot
  method; severity highlighting is not necessarily a separate aging priority.
- **CivicPulse:** Documents numerical severity, summaries, priority controls,
  resolution statistics and Firestore live notifications. Those descriptions were
  not executed or independently validated. A numerical severity score differs from
  an evidence-qualified Low/Medium/High estimate.

The [editable-description/GIS project](https://github.com/SANDHIYAPRIYADHARSHINI/citizen-grievance)
also documents clustered maps, filtering, urgency and duplicate handling. Its
urgency scale differs, and its runtime behavior was not tested.

## Operational platforms outside India

| Place and system | Documented overlap | Boundary of this finding |
|---|---|---|
| Singapore — OneService | AI-assisted complaint categorization, user confirmation and agency routing with location/image context, described by [GovTech in July 2021](https://www.tech.gov.sg/technews/developing-the-one-service-chatbot/) | Not proof of the full severity/priority/description trio. The [current chatbot FAQ](https://www.oneservice.gov.sg/oschatbot-faqs/) explicitly says the Tell Us chatbot cannot identify or describe an issue from the uploaded photo. Do not conflate versions or capabilities. |
| Thailand — Traffy Fondue | Photos, coordinates, AI analysis, automatic responsible-agency routing and tracking in a [government account dated 24 December 2025](https://ayutthaya.prd.go.th/th/content/category/detail/id/9/iid/458578) | This Thai-language account supports these functions, not an identical scoring formula or all eighteen features. |
| United Kingdom — FixMyStreet | Location/category routing, public reports, duplicate prevention, updates and alerts in [mySociety's platform documentation](https://fixmystreet.org/how-it-works/) | Not evidence of matching YOLO severity or generated text. |
| United States — SeeClickFix/CivicPlus | [AI photo-based category suggestions](https://www.civicplus.help/seeclickfix/docs/ai-improved-category-search-and-photo-analysis), [duplicate marking](https://www.civicservice.civicplus.help/hc/en-us/articles/360043293074-Mark-a-Request-as-a-Duplicate), and [configured departmental assignment](https://www.civicplus.help/seeclickfix/docs/add-new-request-categories) | Photo-analysis documentation dates to February 2026 and says suggestions require user selection. It does not establish CivicTrack's severity, age score or grounded-description safeguards. Availability depends on supported product flows. |

An earlier [CitySolution paper submitted in October 2024](https://arxiv.org/abs/2410.12882)
describes photo-based deep-learning classification and citizen/authority apps with
location/status. [CIVOX, Jan–Feb 2026](https://ijsred.com/volume9/issue1/IJSRED-V9I1P284.pdf)
describes geotagged images, duplicate filtering, routing and before/after review.
These are related literature, not confirmed full-feature replicas.

## Related international patent publications

These are **related technical disclosures**, not findings that their claims cover
CivicTrack, and not certifications of current enforceability.

| Jurisdiction / publication | Publication date | Relevant disclosure and difference |
|---|---|---|
| China — [CN110458082A](https://patents.google.com/patent/CN110458082A/en) | 15 November 2019 | Learning/classifying urban-management cases from labeled images and object positions. Not the full citizen complaint/priority/description system. English text is translated. |
| European application — [EP4160249A1](https://data.epo.org/publication-server/rest/v1.2/publication-dates/20230405/patents/EP4160249NWA1/document.pdf) | 5 April 2023 | Vehicle-sensor pothole detection, mapping, sharing and severity based on dimensions. Sensor requirements and workflow differ from a citizen-photo application. |
| United States — [US20240308534A1](https://patents.google.com/patent/US20240308534A1/en) | 19 September 2024 | Vehicle illumination/camera-based road-deformation assessment and severity, with an occupant display. Not a municipal complaint-management stack. |

Public web-index queries against PATENTSCOPE/Espacenet domains returned no useful
direct results in this session; this is a search-access limitation, not evidence
that those databases contain no relevant applications. Some IP India pages and
IEEE full pages were inaccessible. No exhaustive national-database, patent-family,
claims, citation-chain, legal-status or multilingual search was completed.

## What this means for a patent decision

The broad feature bundle should **not be presented as proven globally original**.
However, similarity at feature-list level does not settle whether a precisely
defined technical implementation is patentable. It also does not establish copying
or infringement.

An important legal distinction: novelty is not assessed simply by stitching
features from unrelated documents into an imaginary single system. Inventive-step
assessment is separate. See the [EPO's PCT novelty guidance](https://www.epo.org/en/legal/guidelines-pct/2026/g_vi_1.html).
Indian patentability also requires novelty, inventive step, industrial application
and compliance with exclusions: [IP India](https://ipindia.gov.in/basics-of-patents).
No claim-specific legal conclusion is made here.

Before paying to file, take the closest references and a confidential technical
disclosure to a registered Indian patent agent or the college IPR cell. Identify
the exact technical problem, mechanism and measured advantage, actual inventors/
ownership and any earlier public disclosure dates. Merely changing the name,
municipality, database or feature count should not be assumed to establish novelty.

## Reproducibility and limits

Repository heads recorded through GitHub's public API during review:

| Repository | Inspected head |
|---|---|
| Sujit-1509/CivicAI | `065d7fe54b74655c2bdafef140c89caef303ec7e` |
| aashishvarma0708-ai/ai-agent-hackathon | `3961926b76669b93faad795117da128249e0fbed` |
| aayushmalve/civiclens | `602b157fcecd126f52e51f2a72f033fed7b17603` |
| SANDHIYAPRIYADHARSHINI/citizen-grievance | `bc873331de427a9d5271dc4f2b032de73714a3fb` |
| ifreen22/CivicPulse | `506e0de37ee780b727fbfd285b929c778dfff25c` |

This search is primarily English-language with selected translated/Thai official
material. Unpublished applications, private products, unindexed repositories and
other languages can contain additional material. No percentage-similarity score
or worldwide uniqueness guarantee is justified. No production code, credentials
or application records were changed during this research.
