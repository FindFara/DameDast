using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DameDast.Web.Areas.Admin.Controllers;

[Area("Admin")]
[Authorize(Roles = "Admin")]
[Route("admin")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class DashboardController : Controller
{
    [HttpGet("")]
    [HttpGet("dashboard")]
    public IActionResult Index() => View("~/Areas/Admin/Views/Dashboard/Index.cshtml");
}
