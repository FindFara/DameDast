using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using DameDast.Application.Features.Market.Models;
using DameDast.Application.Features.Market.Queries;

namespace DameDast.Web.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/market")]
public sealed class MarketController(ISender sender) : ControllerBase
{
    [HttpGet]
    public Task<MarketSnapshot> Read(CancellationToken cancellationToken) => sender.Send(new GetMarketQuery(), cancellationToken);
    [HttpGet("history")]
    public Task<IReadOnlyList<PricePoint>> History([FromQuery, BindRequired] string symbol, [FromQuery, BindRequired] int days, CancellationToken cancellationToken) =>
        sender.Send(new GetMarketHistoryQuery(symbol, days), cancellationToken);
}
