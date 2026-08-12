# Customer Flow — Aris Solar CRM

```
Customer Added
      │
      ▼
  REGISTRATION
  Pending Registration
      │
  Pending Documents
      │
  ┌───┴──────────────────┐
  Name Change        Vendor Change / Other Issues
  └───┬──────────────────┘
      │
  Registration Done
      │
      ├─────────────────────────────────────────────────────────────────┐
      │                                                                 │
      │  Single Phase                                                   │  Three Phase
      │                                                                 │
      ├── Self Funded ──────────────────────────────► Waiting Floor     │
      │                                                                 │
      └── Loan ──┐                                                      └── Self Funded ──► FEASIBILITY
                 │                                                                          Feasibility Approved
                 │                                                                               │
                 │                                                                          Estimate Generated
                 │                                                                               │
                 │                                                                           Pay Estimate
                 │                                                                               │
                 │                                                                           Estimate Paid ──► Waiting Floor
                 │
                 │                                                      Three Phase + Loan ──┐
                 ▼                                                                           │
       ┌─────────┴──────────────────────────────────────────────────────────────────────────┘
       │                          FINANCE                                                    │
       │                                                                                     │
       │   ┌──────────────┐        ┌──────────────┐        ┌────────────────────────────┐  │
       │   │    BAJAJ     │        │    SOLFIN    │        │       JAN SAMARTH          │  │
       │   │              │        │              │        │                            │  │
       │   │ Doc Collect  │        │ Doc Collect  │        │ Doc Collection             │  │
       │   │      │       │        │      │       │        │ Portal Registration        │  │
       │   │ Submitted    │        │ Submitted    │        │ Loan File Issued           │  │
       │   │      │       │        │      │       │        │ Customer Bank Visit        │  │
       │   │ Loan Sanct ◄─┼────────┼─ Loan Sanct │        │ Loan Sanctioned ◄──────────┼──┘
       │   │      │       │        │      │       │        │ Bank Site Inspection       │
       │   │ 1st Disburse │        │ 1st Disburse │       │ Agreement Signed           │
       │   │      │       │        │      │       │        │ 1st Disbursement           │
       │   │ Install Done │        │ Install Done │       │ Install Complete            │
       │   │      │       │        │      │       │        │ 2nd Loan File Issued       │
       │   │ Final Disb   │        │ Final Disb   │        │ 2nd Bank Visit             │
       │   └──────────────┘        └──────────────┘        │ Final Disbursement         │
       │                                                    └────────────────────────────┘
       └─────────────────────────────────────────────────────────────────────────────────┘
                                          │
                              Loan Sanctioned reached
                                          │
                                          ▼
                                   WAITING FLOOR
                          (auto-added when conditions met)
                                          │
                                          ▼
                                      DISPATCH
                                  Pending Planning
                                          │
                                   Pending Dispatch
                                          │
                                   Dispatched Today
                                          │
                                          ▼
                                   INSTALLATIONS
                                   Material Upload
                                          │
                               Structure Fabrication
                                          │
                                   Panel Mounting
                                          │
                                      AC Wiring
                                          │
                                      DC Wiring
                                          │
                                          ▼
                                     INTIMATION
                              (docs submitted to DISCOM)
                                          │
                              triggers ───┘
                                          │
                                          ▼
                                    NET METERING
                             Pending Meter Installation
                                          │
                                  Pending Meter State
                                          │
                               Net Metering Complete
                                          │
                                          ▼
                                       SUBSIDY
                               Pending to Claim Subsidy
                                          │
                                  Pending Verification
                                          │
                                  Pending Disbursement
                                          │
                                   Subsidy Disbursed ✓
```

---

## Waiting Floor Entry Conditions

| Phase | Finance | Condition |
|---|---|---|
| Single | Self / None | Registration Done |
| Single | Loan (Bajaj / Solfin / Jan Samarth) | Registration Done + Loan Sanctioned |
| Three | Self / None | Registration Done + Estimate Paid |
| Three | Loan (Bajaj / Solfin / Jan Samarth) | Loan Sanctioned (registration not required) |
